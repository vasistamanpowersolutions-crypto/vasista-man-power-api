const { db } = require('../config/firebase');
const asyncHandler = require('express-async-handler');
const { compressAndUploadImage } = require('../utils/imageCompressionAndUpload');

/**
 * @desc    Get all businesses
 * @route   GET /api/businesses
 */
const getAllBusinesses = asyncHandler(async (req, res) => {
  try {
    const snapshot = await db.collection('businesses').orderBy('createdAt', 'desc').get();
    const businesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(businesses);
  } catch (error) {
    const snapshot = await db.collection('businesses').get();
    const businesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(businesses);
  }
});

/**
 * @desc    Get single business
 * @route   GET /api/businesses/:id
 */
const getBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection('businesses').doc(id).get();
  if (!doc.exists) {
    res.status(404);
    throw new Error('Business not found');
  }
  res.status(200).json({ id: doc.id, ...doc.data() });
});

/**
 * @desc    Create new business
 * @route   POST /api/businesses
 */
const createBusiness = asyncHandler(async (req, res) => {
  const { 
    businessName, ownerName, mobileNumber, email, 
    address, city, state, docType, docImageUrl, businessFrontUrl,
    wantedJobRoles 
  } = req.body;

  if (!businessName || !ownerName || !mobileNumber) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  try {
    // Process and upload images if they are base64 strings
    let processedDocUrl = docImageUrl;
    let processedFrontUrl = businessFrontUrl;

    if (docImageUrl && docImageUrl.startsWith('data:image')) {
      processedDocUrl = await compressAndUploadImage(docImageUrl, 'business-doc.jpg', '/businesses/docs');
    }

    if (businessFrontUrl && businessFrontUrl.startsWith('data:image')) {
      processedFrontUrl = await compressAndUploadImage(businessFrontUrl, 'business-front.jpg', '/businesses/profiles');
    }

    const businessData = {
      businessName,
      ownerName,
      mobileNumber,
      email: email || '',
      address: address || '',
      city: city || '',
      state: state || '',
      wantedJobRoles: wantedJobRoles || '',
      docType,
      docImageUrl: processedDocUrl || '',
      businessFrontUrl: processedFrontUrl || '',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('businesses').add(businessData);
    res.status(201).json({ id: docRef.id, ...businessData });
  } catch (error) {
    res.status(500);
    throw new Error(`Error creating business: ${error.message}`);
  }
});

/**
 * @desc    Update business
 * @route   PUT /api/businesses/:id
 */
const updateBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const docRef = db.collection('businesses').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404);
      throw new Error('Business not found');
    }

    // Handle potential image updates
    if (updateData.docImageUrl && updateData.docImageUrl.startsWith('data:image')) {
      updateData.docImageUrl = await compressAndUploadImage(updateData.docImageUrl, 'business-doc.jpg', '/businesses/docs');
    }
    if (updateData.businessFrontUrl && updateData.businessFrontUrl.startsWith('data:image')) {
      updateData.businessFrontUrl = await compressAndUploadImage(updateData.businessFrontUrl, 'business-front.jpg', '/businesses/profiles');
    }

    await docRef.update({
      ...updateData,
      updatedAt: new Date()
    });

    const updatedDoc = await docRef.get();
    res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    res.status(500);
    throw new Error(`Error updating business: ${error.message}`);
  }
});

/**
 * @desc    Delete business
 * @route   DELETE /api/businesses/:id
 */
const deleteBusiness = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection('businesses').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    res.status(404);
    throw new Error('Business not found');
  }
  await docRef.delete();
  res.status(200).json({ message: 'Business deleted', id });
});

module.exports = {
  getAllBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness
};
