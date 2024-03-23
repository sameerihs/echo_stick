# SmartWaterCan_Server

This repository contains the server-side code for a Smart Water Can system. The system is designed to monitor water can levels, classify images captured by ESP32 Cam using a machine learning model from Google Teachable Machine, and send SMS notifications via Twilio API to the relevant individuals when water cans need refilling.

## Features

- **Cron Job:** The server utilizes a cron job scheduler to trigger tasks at specified intervals. This includes fetching images from Firebase sent by ESP32 Cam, performing image classification, and sending SMS notifications.
- **Image Classification:** Utilizes a machine learning model from Google Teachable Machine to classify images captured by ESP32 Cam. This enables the system to determine the level of water in the cans.

- **Twilio Integration:** Integrates with Twilio API to send SMS notifications to designated individuals when water cans need refilling.

## Prerequisites

Before running the server, ensure you have the following set up:

- Firebase project with Storage for storing images sent by ESP32 Cam.
- Google Teachable Machine model for image classification.
- Twilio account with an active phone number for sending SMS notifications.

## Setup

1. Clone this repository to your local machine:

   ```
   git clone <repository-url>
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up environment variables:

   Create a `.env` file in the root directory of the project and provide the following variables:

   ```
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY=your-firebase-private-key
   FIREBASE_CLIENT_EMAIL=your-firebase-client-email
   GOOGLE_TM_MODEL_URL=your-google-teachable-machine-model-url
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number
   ```

4. Run the server:

   ```
   npm start
   ```

## Cron Job

The server uses a cron job scheduler to perform the following tasks at regular intervals:

- Fetching images from Firebase Storage.
- Performing image classification using the Google Teachable Machine model.
- Sending SMS notifications via Twilio API.

The cron job is configured to run every two hours. You can adjust the cron job schedule as needed in the codebase.

## License

[MIT License](LICENSE)
