const router = require('express').Router();
const { addReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, addReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;