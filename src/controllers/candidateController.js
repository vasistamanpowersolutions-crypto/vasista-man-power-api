const { db } = require('../config/firebase');
const asyncHandler = require('express-async-handler');
const { processMultipleImages } = require('../utils/imageCompressionAndUpload');

// Generate Candidate ID
const generateCandidateId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CAN-${timestamp}${random}`;
};

/**
 * @desc    Get all candidates
 * @route   GET /api/candidates
 */
const getAllCandidates = asyncHandler(async (req, res) => {
  try {
    const snapshot = await db
      .collection('candidates')
      .orderBy('createdAt', 'desc')
      .get();
    
    const candidates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).json(candidates);
  } catch (error) {
    // If orderBy fails, try without it
    const snapshot = await db.collection('candidates').get();
    const candidates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).json(candidates);
  }
});

/**
 * @desc    Get single candidate
 * @route   GET /api/candidates/:id
 */
const getCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const doc = await db.collection('candidates').doc(id).get();
  
  if (!doc.exists) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  
  res.status(200).json({
    id: doc.id,
    ...doc.data()
  });
});

/**
 * @desc    Create new candidate
 * @route   POST /api/candidates
 */
const createCandidate = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    mobileNumber,
    dateOfBirth,
    city,
    state,
    qualification,
    experience,
    skills,
    aadharNumber,
    aadharFront,
    aadharBack,
    panNumber,
    panCard,
    profilePhoto,
    emergencyContactName,
    emergencyContactRelation,
    emergencyContactMobile
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !mobileNumber) {
    res.status(400);
    throw new Error('Missing required fields: firstName, lastName, mobileNumber');
  }

  try {
    const candidateId = generateCandidateId();

    // Compress and upload images to ImageKit, get URLs instead of storing base64
    console.log('Processing and uploading images...');
    const imageUrls = await processMultipleImages({
      aadharFront,
      aadharBack,
      panCard,
      profilePhoto
    });

    const candidateData = {
      candidateId,
      firstName,
      lastName,
      mobileNumber,
      dateOfBirth,
      city,
      state,
      qualification: qualification || '',
      experience: experience || '',
      skills: skills || '',
      aadharNumber,
      aadharFront: imageUrls.aadharFront || '',
      aadharBack: imageUrls.aadharBack || '',
      panNumber,
      panCard: imageUrls.panCard || '',
      profilePhoto: imageUrls.profilePhoto || '',
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactMobile,
      candidateStatus: 'Available',
      kycStatus: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Candidate Data to Save:', { ...candidateData, aadharFront: '...', aadharBack: '...', panCard: '...', profilePhoto: '...' });

    // Save to Firestore (now with URLs instead of large base64 strings)
    const docRef = await db.collection('candidates').add(candidateData);
    console.log('Candidate saved successfully with ID:', docRef.id);

    res.status(201).json({
      id: docRef.id,
      ...candidateData,
      message: 'Candidate created successfully'
    });
  } catch (error) {
    console.error('CRITICAL ERROR in createCandidate:', error);
    res.status(500).json({
      error: {
        message: `Error creating candidate: ${error.message}`,
        stack: error.stack // Include stack trace for debugging
      }
    });
  }
});

/**
 * @desc    Update candidate
 * @route   PUT /api/candidates/:id
 */
const updateCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const doc = await db.collection('candidates').doc(id).get();
    
    if (!doc.exists) {
      res.status(404);
      throw new Error('Candidate not found');
    }

    // Check if any image fields are being updated
    const { aadharFront, aadharBack, panCard, profilePhoto, ...otherData } = req.body;
    
    let updateData = {
      ...otherData,
      updatedAt: new Date()
    };

    // If images are provided, compress and upload them
    if (aadharFront || aadharBack || panCard || profilePhoto) {
      console.log('Processing and uploading updated images...');
      const imageUrls = await processMultipleImages({
        aadharFront,
        aadharBack,
        panCard,
        profilePhoto
      });

      updateData = {
        ...updateData,
        ...imageUrls
      };
    }

    await db.collection('candidates').doc(id).update(updateData);

    const updatedDoc = await db.collection('candidates').doc(id).get();
    
    res.status(200).json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
      message: 'Candidate updated successfully'
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error updating candidate: ${error.message}`);
  }
});

/**
 * @desc    Delete candidate
 * @route   DELETE /api/candidates/:id
 */
const deleteCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await db.collection('candidates').doc(id).get();
    
    if (!doc.exists) {
      res.status(404);
      throw new Error('Candidate not found');
    }

    await db.collection('candidates').doc(id).delete();

    res.status(200).json({
      message: 'Candidate deleted successfully',
      id
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error deleting candidate: ${error.message}`);
  }
});

module.exports = {
  getAllCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate
};
