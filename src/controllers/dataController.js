const { db } = require('../config/firebase');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get all documents from a collection
 * @route   GET /api/collection/:collectionId
 */
const getCollectionData = asyncHandler(async (req, res) => {
  const { collectionId } = req.params;
  
  try {
    const snapshot = await db.collection(collectionId).orderBy('createdAt', 'desc').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (error) {
    // If orderBy 'createdAt' fails because it doesn't exist, try without it
    const snapshot = await db.collection(collectionId).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  }
});

/**
 * @desc    Get a single document from a collection
 * @route   GET /api/collection/:collectionId/:documentId
 */
const getDocumentData = asyncHandler(async (req, res) => {
  const { collectionId, documentId } = req.params;
  const doc = await db.collection(collectionId).doc(documentId).get();

  if (!doc.exists) {
    res.status(404);
    throw new Error('Document not found');
  }

  res.status(200).json({ id: doc.id, ...doc.data() });
});

/**
 * @desc    Add a new document to a collection
 * @route   POST /api/collection/:collectionId
 */
const createDocument = asyncHandler(async (req, res) => {
  const { collectionId } = req.params;
  const body = req.body;

  const newDoc = {
    ...body,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const docRef = await db.collection(collectionId).add(newDoc);
  res.status(201).json({ id: docRef.id, ...newDoc });
});

/**
 * @desc    Update a document in a collection
 * @route   PUT /api/collection/:collectionId/:documentId
 */
const updateDocument = asyncHandler(async (req, res) => {
  const { collectionId, documentId } = req.params;
  const updateData = req.body;

  const docRef = db.collection(collectionId).doc(documentId);
  const doc = await docRef.get();

  if (!doc.exists) {
    res.status(404);
    throw new Error('Document not found');
  }

  // Sanitize data: Remove undefined fields
  const sanitizedData = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined)
  );

  await docRef.update({
    ...sanitizedData,
    updatedAt: new Date()
  });

  const updatedDoc = await docRef.get();
  res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
});

/**
 * @desc    Delete a document from a collection
 * @route   DELETE /api/collection/:collectionId/:documentId
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const { collectionId, documentId } = req.params;
  const docRef = db.collection(collectionId).doc(documentId);
  const doc = await docRef.get();

  if (!doc.exists) {
    res.status(404);
    throw new Error('Document not found');
  }

  await docRef.delete();
  res.status(200).json({ message: 'Document deleted successfully', id: documentId });
});

module.exports = {
  getCollectionData,
  getDocumentData,
  createDocument,
  updateDocument,
  deleteDocument
};
