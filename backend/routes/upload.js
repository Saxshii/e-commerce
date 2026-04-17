const router = require('express').Router();
const { upload } = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/image', protect, adminOnly, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: req.file.path, public_id: req.file.filename });
});

module.exports = router;