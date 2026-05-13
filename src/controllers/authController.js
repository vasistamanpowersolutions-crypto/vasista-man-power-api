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
    
    console.log('Descope Verify Success. authInfo keys:', Object.keys(authInfo));
    
    // Find the session token (brute force search for JWT)
    let sessionJwt = null;
    
    // Check if the response is wrapped in a 'data' property (common in some SDK versions or wrappers)
    const effectiveAuthInfo = authInfo.data || authInfo;
    
    console.log('Effective auth info keys:', Object.keys(effectiveAuthInfo));

    if (effectiveAuthInfo.sessionToken) {
      sessionJwt = typeof effectiveAuthInfo.sessionToken === 'string' ? effectiveAuthInfo.sessionToken : effectiveAuthInfo.sessionToken.jwt;
    } else if (effectiveAuthInfo.sessionJwt) {
      sessionJwt = effectiveAuthInfo.sessionJwt;
    } else {
      // Fallback: look for any string that looks like a JWT
      for (const key of Object.keys(effectiveAuthInfo)) {
        if (typeof effectiveAuthInfo[key] === 'string' && effectiveAuthInfo[key].split('.').length === 3) {
          console.log(`Found potential JWT in key: ${key}`);
          sessionJwt = effectiveAuthInfo[key];
          break;
        }
        if (effectiveAuthInfo[key] && typeof effectiveAuthInfo[key] === 'object' && effectiveAuthInfo[key].jwt) {
          console.log(`Found JWT in nested object key: ${key}`);
          sessionJwt = effectiveAuthInfo[key].jwt;
          break;
        }
      }
    }

    if (sessionJwt) {
      console.log('Successfully extracted sessionJwt');
      
      // Create a clean response object to ensure it's serializable and predictable
      const responseData = {
        success: true,
        authInfo: {
          ...effectiveAuthInfo,
          sessionToken: { jwt: sessionJwt }
        }
      };

      return res.status(200).json(responseData);
    } else {
      console.error('CRITICAL: No JWT found in authInfo. Keys available:', Object.keys(authInfo));
      if (authInfo.data) console.error('Data keys:', Object.keys(authInfo.data));
      
      return res.status(500).json({
        success: false,
        error: 'Authentication successful but token extraction failed'
      });
    }
  } catch (error) {
    console.error('Descope OTP Verify Error Details:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired OTP'
    });
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

/**
 * @desc    Check if mobile number belongs to candidate or business
 * @route   GET /api/auth/check-role/:phoneNumber
 * @access  Public
 */
const checkUserRole = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.params;

  if (!phoneNumber) {
    res.status(400);
    throw new Error('Please provide a mobile number');
  }

  console.log('Checking role for phone number:', phoneNumber);

  // Normalize phone number: ensure we check both with and without +91
  const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10); // Last 10 digits
  const prefixedNumber = `+91${cleanNumber}`;

  console.log('Normalized numbers to check:', { cleanNumber, prefixedNumber });

  const numbersToTry = [cleanNumber, prefixedNumber];

  // Check in candidates
  let candidateData = null;
  let candidateDoc = null;

  for (const num of numbersToTry) {
    const snapshot = await db.collection('candidates')
      .where('mobileNumber', '==', num)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      candidateDoc = snapshot.docs[0];
      candidateData = candidateDoc.data();
      break;
    }
  }

  if (candidateData) {
    return res.status(200).json({
      success: true,
      exists: true,
      role: 'candidate',
      user: {
        id: candidateDoc.id,
        ...candidateData
      }
    });
  }

  // Check in businesses
  let businessData = null;
  let businessDoc = null;

  for (const num of numbersToTry) {
    const snapshot = await db.collection('businesses')
      .where('mobileNumber', '==', num)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      businessDoc = snapshot.docs[0];
      businessData = businessDoc.data();
      break;
    }
  }

  if (businessData) {
    return res.status(200).json({
      success: true,
      exists: true,
      role: 'business',
      user: {
        id: businessDoc.id,
        ...businessData
      }
    });
  }

  res.status(200).json({
    success: true,
    exists: false
  });
});

module.exports = {
  sendOTP,
  verifyOTP,
  firebaseLogin,
  checkUserRole
};
