const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, firebaseLogin, checkUserRole } = require('../controllers/authController');

// Descope Mobile OTP Login
router.post('/login/mobile/send', sendOTP);
router.post('/login/mobile/verify', verifyOTP);
router.get('/check-role/:phoneNumber', checkUserRole);

// Firebase Email/Password Login
router.post('/login/firebase', firebaseLogin);

module.exports = router;
