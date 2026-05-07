const asyncHandler = require('express-async-handler');
const { db } = require('../config/firebase');

// Check if the authenticated user (admin/staff) has a specific permission
const checkPermission = (requiredPermission) => {
  return asyncHandler(async (req, res, next) => {
    // req.user is set by protectAdmin middleware (Firebase token)
    // We need to find the staff record in Firestore associated with this email
    
    const email = req.user.email;
    
    if (!email) {
      res.status(403);
      throw new Error('User email not found in token');
    }

    const staffSnapshot = await db.collection('vasista_employees')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (staffSnapshot.empty) {
      // If not in staff collection, check if it's the primary admin (optional)
      // For now, let's assume all staff must be in the collection
      res.status(403);
      throw new Error('Access denied: Staff record not found');
    }

    const staffData = staffSnapshot.docs[0].data();
    const permissions = staffData.permissions || [];

    if (permissions.includes(requiredPermission) || staffData.role === 'super_admin') {
      next();
    } else {
      res.status(403);
      throw new Error(`Access denied: Missing permission [${requiredPermission}]`);
    }
  });
};

module.exports = { checkPermission };
