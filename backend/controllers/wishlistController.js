const { pool } = require('../config/db');

const getWishlist = async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT w.id, w.created_at, p.id as product_id, p.name, p.slug, p.price, p.compare_price,
        img.image_url as primary_image
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = 1
      WHERE w.user_id = ?
    `, [req.user.id]);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    const [existing] = await pool.query('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    if (existing.length) {
      await pool.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
      return res.json({ wishlisted: false });
    }
    await pool.query('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
    res.json({ wishlisted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getWishlist, toggleWishlist };