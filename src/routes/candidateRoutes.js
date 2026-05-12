const express = require('express');
const router = express.Router();
const {
  getAllCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate
} = require('../controllers/candidateController');
const { protectAdmin } = require('../middlewares/authMiddleware');

// Apply admin authentication to all routes
router.use(protectAdmin);

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
