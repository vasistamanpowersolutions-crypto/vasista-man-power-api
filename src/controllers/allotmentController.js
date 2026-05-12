const { db } = require('../config/firebase');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get all allotments
 * @route   GET /api/allotments
 */
const getAllAllotments = asyncHandler(async (req, res) => {
  const snapshot = await db.collection('allotments').orderBy('allottedDate', 'desc').get();
  const allotments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.status(200).json(allotments);
});

/**
 * @desc    Get allotments by Candidate or Business
 * @route   GET /api/allotments/filter
 */
const getAllotmentsByFilter = asyncHandler(async (req, res) => {
  const { candidateId, businessId } = req.query;
  let query = db.collection('allotments');

  if (candidateId) {
    query = query.where('candidateId', '==', candidateId);
  }
  if (businessId) {
    query = query.where('businessId', '==', businessId);
  }

  try {
    const snapshot = await query.orderBy('allottedDate', 'desc').get();
    const allotments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(allotments);
  } catch (error) {
    console.error('Firestore query failed (likely missing index):', error);
    // Fallback: fetch without order and sort in memory
    const snapshot = await query.get();
    const allotments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    allotments.sort((a, b) => new Date(b.allottedDate) - new Date(a.allottedDate));
    res.status(200).json(allotments);
  }
});

/**
 * @desc    Create new allotment
 * @route   POST /api/allotments
 */
const createAllotment = asyncHandler(async (req, res) => {
  const { 
    candidateId, businessId, role, allottedDate, 
    candidateName, businessName 
  } = req.body;

  if (!candidateId || !businessId || !role || !allottedDate) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  const allotmentData = {
    candidateId,
    businessId,
    role,
    allottedDate,
    candidateName,
    businessName,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const docRef = await db.collection('allotments').add(allotmentData);

  // Update Candidate status to 'allotted'
  await db.collection('candidates').doc(candidateId).update({
    candidateStatus: 'allotted',
    updatedAt: new Date()
  });

  res.status(201).json({ id: docRef.id, ...allotmentData });
});

/**
 * @desc    Delete allotment
 * @route   DELETE /api/allotments/:id
 */
const deleteAllotment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection('allotments').doc(id);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    res.status(404);
    throw new Error('Allotment not found');
  }

  const { candidateId } = doc.data();

  await docRef.delete();

  // Reset Candidate status to 'available'
  await db.collection('candidates').doc(candidateId).update({
    candidateStatus: 'available',
    updatedAt: new Date()
  });

  res.status(200).json({ message: 'Allotment deleted', id });
});

module.exports = {
  getAllAllotments,
  getAllotmentsByFilter,
  createAllotment,
  deleteAllotment
};
