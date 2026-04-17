const { pool } = require('../config/db');

const addReview = async (req, res) => {
  try {
    const { product_id, rating, title, body } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });
    await pool.query(
      'INSERT INTO reviews (user_id, product_id, rating, title, body) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating=?, title=?, body=?',
      [req.user.id, product_id, rating, title, body, rating, title, body]
    );
    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { addReview, deleteReview };