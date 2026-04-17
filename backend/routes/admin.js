const router = require('express').Router();
const { getDashboardStats, getCustomers, getDiscounts, createDiscount } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/stats', getDashboardStats);
router.get('/customers', getCustomers);
router.get('/discounts', getDiscounts);
router.post('/discounts', createDiscount);

module.exports = router;