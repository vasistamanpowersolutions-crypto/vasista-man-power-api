const express = require('express');
const router = express.Router();
const { 
  getCollectionData, 
  getDocumentData, 
  createDocument, 
  updateDocument, 
  deleteDocument 
} = require('../controllers/dataController');

// Routes for Collection
router.route('/:collectionId')
  .get(getCollectionData)
  .post(createDocument);

// Routes for Specific Document
router.route('/:collectionId/:documentId')
  .get(getDocumentData)
  .put(updateDocument)
  .delete(deleteDocument);

module.exports = router;
