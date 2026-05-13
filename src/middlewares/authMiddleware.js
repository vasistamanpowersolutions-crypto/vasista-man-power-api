const { auth } = require('../config/firebase');
const descopeClient = require('../config/descope');
const asyncHandler = require('express-async-handler');

// Verify Firebase Token (for Admins)
const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check for Admin Secret Key (Development Bypass)
  const secretKey = req.headers['x-admin-secret'];
  if (secretKey && secretKey === process.env.ADMIN_SECRET_KEY) {
    req.user = { role: 'admin', uid: 'dev-admin' };
    return next();
  }

  // 2. Check for Firebase Token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase Auth Error:', error.message);
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
});

// Verify Descope Token (for Candidates/Business Owners)
const protectDescope = asyncHandler(async (req, res, next) => {
  let sessionToken;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    sessionToken = req.headers.authorization.split(' ')[1];
  }

  if (!sessionToken) {
    res.status(401);
    throw new Error('Not authorized, no Descope session token');
  }

  try {
    const authInfo = await descopeClient.validateSession(sessionToken);
    req.user = authInfo.token;
    next();
  } catch (error) {
    console.error('Descope Auth Error:', error.message);
    res.status(401);
    throw new Error('Not authorized, Descope session failed');
  }
});

// Verify either Admin (Secret/Firebase) or Descope User
const protectAny = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Try Admin Secret Key
  const secretKey = req.headers['x-admin-secret'];
  if (secretKey && secretKey === process.env.ADMIN_SECRET_KEY) {
    req.user = { role: 'admin', uid: 'dev-admin' };
    return next();
  }

  // 2. Try Firebase/Descope Token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'undefined' || token === 'null') {
    res.status(401);
    throw new Error('Not authorized, invalid token format');
  }

  // Try Descope validation first (most common for website)
  try {
    if (!descopeClient) {
      throw new Error('Descope client not initialized');
    }
    const authInfo = await descopeClient.validateSession(token);
    req.user = authInfo.token;
    return next();
  } catch (descopeErr) {
    const isDescopeExpired = descopeErr.message?.includes('JWTExpired');
    
    // If it's a Descope token and it's expired, don't confuse with Firebase errors
    if (isDescopeExpired) {
      res.status(401);
      throw new Error('Your session has expired. Please log in again.');
    }

    // Try Firebase validation (for Admin Panel)
    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      return next();
    } catch (firebaseErr) {
      // If BOTH failed, determine the most relevant error
      res.status(401);
      
      // If it looks like a Descope token (based on audience error in Firebase), show Descope error
      if (firebaseErr.message?.includes('incorrect "aud"')) {
        throw new Error(`Authentication failed: ${descopeErr.message}`);
      }
      
      throw new Error('Not authorized: Invalid or expired token');
    }
  }
});

module.exports = { protectAdmin, protectDescope, protectAny };
