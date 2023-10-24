require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const moment = require("moment-timezone"); // Import moment-timezone

// App config
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB config
const username = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;
const connectionUri = `mongodb+srv://${username}:${password}@reminderwp.r1c8vd6.mongodb.net/?retryWrites=true&w=majority`;

mongoose
  .connect(connectionUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 300000,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    const port = process.env.PORT || 9000;
    app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Schema
const reminderSchema = new mongoose.Schema({
  phoneNumber: String,
  reminderMsg: String,
  remindAt: Date,
  isReminded: Boolean,
});
const Reminder = mongoose.model("Reminder", reminderSchema);

const sendReminder = async (reminder) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const phoneNumberRegex = /^\d{10}$/;
  if (!phoneNumberRegex.test(reminder.phoneNumber)) {
    console.log("Invalid phone number");
    return;
  }

  const client = require("twilio")(accountSid, authToken);

  try {
    const message = await client.messages.create({
      body: reminder.reminderMsg,
      from: "whatsapp:+14155238886",
      to: `whatsapp:+91${reminder.phoneNumber}`,
    });
    console.log(message.sid);
  } catch (error) {
    console.log("Error sending reminder:", error);
  }
};

// Schedule reminders check
setInterval(async () => {
  const now = new Date();
  try {
    const reminderList = await Reminder.find({
      isReminded: false,
      remindAt: { $lte: now },
    });
    for (const reminder of reminderList) {
      sendReminder(reminder);
      // Delete the reminder after it's sent
      await Reminder.findByIdAndDelete(reminder._id);
    }
  } catch (error) {
    console.log("Error updating or sending reminders:", error);
  }
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
      remindAt: moment.tz(remindAt, "Asia/Kolkata").toDate(), // Convert remindAt to Date object using moment.js with timezone
      isReminded: false,
    });

    await reminder.save();
    const updatedReminderList = await Reminder.find({});
    res.send(updatedReminderList);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

app.post("/deleteReminder", async (req, res) => {
  const { id } = req.body;

  try {
    await Reminder.deleteOne({ _id: id });
    const updatedReminderList = await Reminder.find({});
    res.send(updatedReminderList);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

module.exports = app;
