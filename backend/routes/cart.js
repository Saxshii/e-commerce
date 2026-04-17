const router = require('express').Router();
const { pool } = require('../config/db');

// Cart lives in frontend localStorage + React Context.
// This endpoint validates items (price & stock) server-side before checkout.
router.post('/validate', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) return res.json([]);
    const ids = items.map(i => i.product_id);
    const [products] = await pool.query(
      `SELECT id, name, price, stock FROM products WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const map = {};
    products.forEach(p => (map[p.id] = p));
    const validated = items.map(item => ({
      ...item,
      current_price: map[item.product_id]?.price,
      in_stock: (map[item.product_id]?.stock || 0) >= item.quantity,
      product_name: map[item.product_id]?.name,
    }));
    res.json(validated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;