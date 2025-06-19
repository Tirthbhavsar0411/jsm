require('dotenv').config(); // Make sure it's at the top if not already loaded

const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS = async (to, message) => {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to: to,
  });
};

module.exports = sendSMS;
