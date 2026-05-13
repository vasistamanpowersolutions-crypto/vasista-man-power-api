const express = require('express');
const router = express.Router();
const {
  getAllCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate
} = require('../controllers/candidateController');
const { protectAny } = require('../middlewares/authMiddleware');

// Apply authentication to all routes (allows Admin or Descope user)
router.use(protectAny);

// Get all candidates
router.get('/', getAllCandidates);

// Get single candidate
router.get('/:id', getCandidate);

// Create new candidate
router.post('/', createCandidate);

// Update candidate
router.put('/:id', updateCandidate);

// Delete candidate
router.delete('/:id', deleteCandidate);

module.exports = router;
