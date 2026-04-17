const router = require('express').Router();
const { getMyOrders, getOrderById, validateDiscount, getAllOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/my', protect, getMyOrders);
router.get('/admin', protect, adminOnly, getAllOrders);
router.post('/validate-discount', validateDiscount);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

module.exports = router;