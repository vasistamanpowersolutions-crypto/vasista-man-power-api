const descopeClient = require('../config/descope');
const { db } = require('../config/firebase');
const { auth: firebaseAuth } = require('../config/firebaseClient');
const { signInWithEmailAndPassword } = require('firebase/auth');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Send OTP to mobile number
 * @route   POST /api/auth/login/mobile/send
 * @access  Public
 */
const sendOTP = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400);
    throw new Error('Please provide a mobile number');
  }

  try {
    // We use the descope client to start the OTP flow via SMS
    const resp = await descopeClient.otp.signUpOrIn.sms(phoneNumber);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      phoneNumber
    });
  } catch (error) {
    console.error('Descope OTP Send Error:', error);
    res.status(500);
    throw new Error('Failed to send OTP: ' + error.message);
  }
});

/**
 * @desc    Verify OTP and return session
 * @route   POST /api/auth/login/mobile/verify
 * @access  Public
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    res.status(400);
    throw new Error('Please provide mobile number and OTP');
  }

  try {
    // Verify the OTP using Descope
    const authInfo = await descopeClient.otp.verify.sms(phoneNumber, otp);
    
    // For now, we return the session token and basic user info
    // We will expand this with Firestore logic as we rebuild
    res.status(200).json({
      success: true,
      sessionToken: authInfo.sessionToken.jwt,
      user: authInfo.user
    });
  } catch (error) {
    console.error('Descope OTP Verify Error:', error);
    res.status(401);
    throw new Error('Invalid or expired OTP');
  }
});

/**
 * @desc    Login with Firebase Email and Password
 * @route   POST /api/auth/login/firebase
 * @access  Public
 */
const firebaseLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    res.status(200).json({
      success: true,
      token: idToken,
      user: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Firebase Login Error:', error.message);
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

module.exports = {
  sendOTP,
  verifyOTP,
  firebaseLogin
};
