const express = require('express');
const router = express.Router();
const {
  getAllAllotments,
  getAllotmentsByFilter,
  createAllotment,
  deleteAllotment
} = require('../controllers/allotmentController');
const { protectAdmin } = require('../middlewares/authMiddleware');

router.use(protectAdmin);

router.get('/', getAllAllotments);
router.get('/filter', getAllotmentsByFilter);
router.post('/', createAllotment);
router.delete('/:id', deleteAllotment);

module.exports = router;
