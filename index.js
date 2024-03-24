// Import necessary modules
const express = require("express");
const { CronJob } = require("cron");
const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");
const twilio = require("twilio");
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const YourTeachableMachine = require("./TeachableMachine");

// Load environment variables from .env file
dotenv.config();
const app = express();
app.use(cors());
const serviceAccount = {
  type: "service_account",
  project_id: "smart-bubble-top-server",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-s73tt%40smart-bubble-top-server.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.BUCKET_URL,
});

const db = admin.firestore();

// Function to check if the file is a PNG
function isPNG(buffer) {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < pngSignature.length; i++) {
    if (buffer[i] !== pngSignature[i]) {
      return false;
    }
  }
  return true;
}

// Function to check if the file is a JPEG
function isJPEG(buffer) {
  // JPEG signature: FF D8 FF
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

// Set up cron job to fetch image from Firebase Storage,  call Google Teachable Machine API, and then Twilio API

const cronJob = new CronJob("0 0 */2 * * *", async () => {
  console.log("Cron job started.");

  try {
    const waterCansRef = db.collection("waterCans");
    const collectionExists = await waterCansRef
      .get()
      .then(() => true)
      .catch(() => false);

    if (!collectionExists) {
      console.log(
        "No collection named 'waterCans' found. Waiting for the next cron job."
      );
      return;
    }

    const snapshot = await waterCansRef.get();

    for (const doc of snapshot.docs) {
      // Loop synchronously through the documents
      const {
        fetchInterval,
        id,
        image,
        location,
        phoneNumber,
        timestampField,
        title,
      } = doc.data();

      const bucket = admin.storage().bucket();
      const filePath = image;
      const file = bucket.file(filePath);

      let directory = "temp";
      let filename = "image";
      if (filePath.endsWith(".png")) {
        filename += ".png";
      } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        filename += ".jpg";
      } else {
        console.log("Unsupported file type.");
        continue; // Skip this document and proceed to the next one
      }

      const tempDir = path.join(__dirname, directory);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const tempFilePath = path.join(tempDir, filename);

      if (!fs.existsSync(tempFilePath)) {
        fs.writeFileSync(tempFilePath, ""); // Create an empty file
      }

      await file.download({ destination: tempFilePath });

      // Read the downloaded file as a buffer
      const bufferData = fs.readFileSync(tempFilePath);

      // Check if the file is a PNG or JPEG
      let fileType = "";
      if (isPNG(bufferData)) {
        fileType = "png";
      } else if (isJPEG(bufferData)) {
        fileType = "jpeg";
      } else {
        console.log("Unsupported file type.");
        continue; // Skip this document and proceed to the next one
      }
      console.log("File type:", fileType);

      // Define model parameters
      const modelParams = {
        modelUrl: "https://teachablemachine.withgoogle.com/models/CUU-5erFK/",
      };
      const tm = new YourTeachableMachine(modelParams);
      const imagePath = tempFilePath; // Use the downloaded temp file path
      const predictions = await tm.classify({ imagePath, fileType });
      console.log("Title:", title);
      console.log("Predictions:", predictions);

      await doc.ref.update({ timestampField: new Date().toLocaleString() });

      // Send SMS notification using Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = new twilio(accountSid, authToken);
      if (predictions[0].class === "Yes") {
        console.log("Sending SMS for the water can:", title);
        const message = await client.messages
          .create({
            body: `The "${title}" at ${location} is empty.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.MY_PHONE_NUMBER,
          })
          .then((message) => console.log("Message sent:", message.sid))
          .catch((error) => console.error("Error sending message:", error));
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

// Start the cron job
cronJob.start();

// Define route to trigger the cron job manually
app.get("/trigger-job", async (req, res) => {
  // Manually trigger the cron job
  try {
    const waterCansRef = db.collection("waterCans");
    const collectionExists = await waterCansRef
      .get()
      .then(() => true)
      .catch(() => false);

    if (!collectionExists) {
      console.log(
        "No collection named 'waterCans' found. Waiting for the next cron job."
      );
      return;
    }

    const snapshot = await waterCansRef.get();

    for (const doc of snapshot.docs) {
      // Loop synchronously through the documents
      const {
        fetchInterval,
        id,
        image,
        location,
        phoneNumber,
        timestampField,
        title,
      } = doc.data();

      const bucket = admin.storage().bucket();
      const filePath = image;
      const file = bucket.file(filePath);

      let directory = "temp";
      let filename = "image";
      if (filePath.endsWith(".png")) {
        filename += ".png";
      } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        filename += ".jpg";
      } else {
        console.log("Unsupported file type.");
        continue; // Skip this document and proceed to the next one
      }

      const tempDir = path.join(__dirname, directory);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const tempFilePath = path.join(tempDir, filename);

      if (!fs.existsSync(tempFilePath)) {
        fs.writeFileSync(tempFilePath, ""); // Create an empty file
      }

      await file.download({ destination: tempFilePath });

      // Read the downloaded file as a buffer
      const bufferData = fs.readFileSync(tempFilePath);

      // Check if the file is a PNG or JPEG
      let fileType = "";
      if (isPNG(bufferData)) {
        fileType = "png";
      } else if (isJPEG(bufferData)) {
        fileType = "jpeg";
      } else {
        console.log("Unsupported file type.");
        continue; // Skip this document and proceed to the next one
      }
      console.log("File type:", fileType);

      // Define model parameters
      const modelParams = {
        modelUrl: "https://teachablemachine.withgoogle.com/models/CUU-5erFK/",
      };
      const tm = new YourTeachableMachine(modelParams);
      const imagePath = tempFilePath; // Use the downloaded temp file path
      const predictions = await tm.classify({ imagePath, fileType });
      console.log("Title:", title);
      console.log("Predictions:", predictions);

      await doc.ref.update({ timestampField: new Date().toLocaleString() });

      // Send SMS notification using Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = new twilio(accountSid, authToken);
      if (predictions[0].class === "Yes") {
        console.log("Sending SMS for the water can:", title);
        const message = await client.messages
          .create({
            body: `The "${title}" at ${location} is empty.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.MY_PHONE_NUMBER,
          })
          .then((message) => console.log("Message sent:", message.sid))
          .catch((error) => console.error("Error sending message:", error));
      }
    }
    res.status(200).send("Job triggered successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal server error");
  }
});

app.head("/trigger-job2", async (req, res) => {
  try {
    const waterCansRef = db.collection("waterCans");
    const collectionExists = await waterCansRef
      .get()
      .then(() => true)
      .catch(() => false);

    if (!collectionExists) {
      console.log(
        "No collection named 'waterCans' found. Waiting for the next cron job."
      );
      return;
    }

    const snapshot = await waterCansRef.get();

    for (const doc of snapshot.docs) {
      // Loop synchronously through the documents
      const {
        fetchInterval,
        id,
        image,
        location,
        phoneNumber,
        timestampField,
        title,
      } = doc.data();

      const bucket = admin.storage().bucket();
      const filePath = image;
      const file = bucket.file(filePath);

      let directory = "temp";
      let filename = "image";
      if (filePath.endsWith(".png")) {
        filename += ".png";
      } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        filename += ".jpg";
      } else {
        console.log("Unsupported file type.");
        continue; // Skip this document and proceed to the next one
      }

      const tempDir = path.join(__dirname, directory);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const tempFilePath = path.join(tempDir, filename);

      if (!fs.existsSync(tempFilePath)) {
        fs.writeFileSync(tempFilePath, ""); // Create an empty file
      }

      await file.download({ destination: tempFilePath });

      // Read the downloaded file as a buffer
      const bufferData = fs.readFileSync(tempFilePath);

      // Check if the file is a PNG or JPEG
      let fileType = "";
      if (isPNG(bufferData)) {
        fileType = "png";
      } else if (isJPEG(bufferData)) {
        fileType = "jpeg";
      } else {
        console.log("Unsupported file type.");
        continue; // Skip this document and proceed to the next one
      }
      console.log("File type:", fileType);

      // Define model parameters
      const modelParams = {
        modelUrl: "https://teachablemachine.withgoogle.com/models/CUU-5erFK/",
      };
      const tm = new YourTeachableMachine(modelParams);
      const imagePath = tempFilePath; // Use the downloaded temp file path
      const predictions = await tm.classify({ imagePath, fileType });
      console.log("Title:", title);
      console.log("Predictions:", predictions);

      await doc.ref.update({ timestampField: new Date().toLocaleString() });

      // Send SMS notification using Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = new twilio(accountSid, authToken);
      if (predictions[0].class === "Yes") {
        console.log("Sending SMS for the water can:", title);
        const message = await client.messages
          .create({
            body: `The "${title}" at ${location} is empty.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.MY_PHONE_NUMBER,
          })
          .then((message) => console.log("Message sent:", message.sid))
          .catch((error) => console.error("Error sending message:", error));
      }
    }
    res.status(200).end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal server error");
  }
});

// Stop the cron job after 1 minute (for demonstration purposes)
// setTimeout(() => {
//   cronJob.stop();
//   console.log("Cron job stopped.");
// }, 600000); // 10 minute (60000 milliseconds *10)

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
