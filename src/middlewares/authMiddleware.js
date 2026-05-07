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

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  // Try Descope validation first (most common for website)
  try {
    const authInfo = await descopeClient.validateSession(token);
    req.user = authInfo.token;
    return next();
  } catch (descopeErr) {
    // If Descope fails, try Firebase (for Admin Panel real tokens)
    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      return next();
    } catch (firebaseErr) {
      console.error('Auth Error (Any): Both Descope and Firebase failed');
      res.status(401);
      throw new Error('Not authorized, token invalid');
    }
  }
});

module.exports = { protectAdmin, protectDescope, protectAny };
