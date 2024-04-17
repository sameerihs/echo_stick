// Import necessary modules
const express = require("express");
const { CronJob } = require("cron");
const twilio = require("twilio");
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env file
dotenv.config();
const app = express();
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

app.post("/send-sms", async (req, res) => {
  console.log("Received a POST request to send-sms route");
  console.log("Request body:", req.body);
  const { body } = req.body;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = new twilio(accountSid, authToken);
  client.messages
    .create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.MY_PHONE_NUMBER,
    })
    .then((message) => {
      console.log("Message sent:", message.sid);
      res.status(200).send("Message sent successfully");
    })
    .catch((error) => {
      console.error("Error sending message:", error);
      res.status(500).send("Error sending message");
    });
});

app.get("/get-sms", async (_req_, res) => {
  console.log("Received a GET request to get-sms route");

  try {
    // Send a Twilio SMS message with the message "Fall Detected"
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = new twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: "Fall Detected",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.MY_PHONE_NUMBER,
    });

    console.log("Message sent:", message.sid);
    res.status(200).send("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send("Error sending message");
  }
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
