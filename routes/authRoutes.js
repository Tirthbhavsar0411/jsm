const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios'); // to verify captcha
const Otp = require("../models/Otp");
const sendSMS = require("../utils/sendSMS");

// Request OTP route
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // valid for 5 minutes
    });

    const message = `OTP for admin signup (${email}): ${otpCode}`;

    // Wrap sendSMS in try/catch to avoid crashing if SMS fails
    try {
      await sendSMS(process.env.ADMIN_PHONE, message);
    } catch (smsErr) {
      console.error("Failed to send SMS:", smsErr);
      // You may choose to proceed or fail here based on your app logic
    }

    res.json({ message: 'OTP sent to admin. Contact admin to get OTP.' });
  } catch (err) {
    console.error("Request OTP error:", err);
    res.status(500).json({ error: 'OTP request failed' });
  }
});

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;
    if (!name || !email || !password || !role || !otp) {
      return res.status(400).json({ error: "All fields including OTP are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp || validOtp.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    await Otp.deleteMany({ email });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, passwordHash: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Admin Login with reCAPTCHA verification
router.post('/login', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ error: 'Captcha token is required' });
    }

    // Verify reCAPTCHA token with Google
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Add this to your .env
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

    const response = await axios.post(verifyUrl);

    if (!response.data.success) {
      return res.status(400).json({ error: 'Failed captcha verification' });
    }

    // Proceed with login
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
