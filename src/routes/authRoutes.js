const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, firebaseLogin } = require('../controllers/authController');

// Descope Mobile OTP Login
router.post('/login/mobile/send', sendOTP);
router.post('/login/mobile/verify', verifyOTP);

// Firebase Email/Password Login
router.post('/login/firebase', firebaseLogin);

module.exports = router;
