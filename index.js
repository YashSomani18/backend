require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const username = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;
const connectionUri = `mongodb+srv://${username}:${password}@reminderwp.r1c8vd6.mongodb.net/?retryWrites=true&w=majority`;

// App config
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// DB config
mongoose
  .connect(connectionUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(process.env.PORT || 9000, () => {
      console.log("Backend working successfully");
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Schema
const reminderSchema = new mongoose.Schema({
  phoneNumber: String, // Added phoneNumber field
  reminderMsg: String,
  remindAt: String,
  isReminded: Boolean,
});
const Reminder = mongoose.model("reminder", reminderSchema);

const sendReminder = (reminder) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const phoneNumberRegex = /^\d{10}$/;
  if (!phoneNumberRegex.test(reminder.phoneNumber)) {
    console.log("Invalid phone number");
    return;
  }

  const client = require("twilio")(accountSid, authToken);

  client.messages
    .create({
      body: reminder.reminderMsg,
      from: "whatsapp:+14155238886",
      to: `whatsapp:+91${reminder.phoneNumber}`,
    })
    .then((message) => console.log(message.sid))
    .catch((err) => console.log(err));
};

// Schedule reminders check
setInterval(() => {
  const now = new Date();
  Reminder.find({ isReminded: false, remindAt: { $lt: now } })
    .then((reminderList) => {
      reminderList.forEach((reminder) => {
        Reminder.findByIdAndUpdate(reminder._id, { isReminded: true })
          .then((remindObj) => {
            sendReminder(reminder);
          })
          .catch((err) => {
            console.log(err);
          });
      });
    })
    .catch((err) => {
      console.log(err);
    });
}, 1000);

// API Routes
app.get("/getAllReminder", async (req, res) => {
  try {
    const reminderList = await Reminder.find({});
    res.send(reminderList);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

app.post("/addReminder", async (req, res) => {
  const { phoneNumber, reminderMsg, remindAt } = req.body;

  try {
    const reminder = new Reminder({
      phoneNumber,
      reminderMsg,
      remindAt,
      isReminded: false,
    });

    await reminder.save();
    const reminderList = await Reminder.find({});
    res.send(reminderList);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

app.post("/deleteReminder", async (req, res) => {
  const { id } = req.body;

  try {
    await Reminder.deleteOne({ _id: id });
    const reminderList = await Reminder.find({});
    res.send(reminderList);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = app;
