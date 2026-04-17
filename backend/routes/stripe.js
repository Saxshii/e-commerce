const router = require('express').Router();
const { createCheckoutSession, webhook, getSessionOrder } = require('../controllers/stripeController');
const { protect } = require('../middleware/auth');

// Webhook uses raw body (registered before express.json in server.js)
router.post('/webhook', webhook);
router.post('/create-checkout-session', protect, createCheckoutSession);
router.get('/order/:session_id', getSessionOrder);

module.exports = router;