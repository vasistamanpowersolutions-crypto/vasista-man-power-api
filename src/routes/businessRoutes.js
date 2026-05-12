const express = require('express');
const router = express.Router();
const {
  getAllBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness
} = require('../controllers/businessController');
const { protectAdmin } = require('../middlewares/authMiddleware');

router.use(protectAdmin);

router.get('/', getAllBusinesses);
router.get('/:id', getBusiness);
router.post('/', createBusiness);
router.put('/:id', updateBusiness);
router.delete('/:id', deleteBusiness);

module.exports = router;
