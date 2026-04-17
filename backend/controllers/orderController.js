const { pool } = require('../config/db');

const getMyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const validateDiscount = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const [rows] = await pool.query(`
      SELECT * FROM discounts
      WHERE code = ? AND is_active = 1
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR used_count < max_uses)
    `, [code]);

    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired discount code' });
    const discount = rows[0];
    if (orderTotal < discount.min_order_amount)
      return res.status(400).json({ error: `Minimum order amount is ₹${discount.min_order_amount}` });

    const savings = discount.type === 'percentage'
      ? (orderTotal * discount.value) / 100
      : discount.value;

    res.json({ valid: true, discount, savings: Math.min(savings, orderTotal) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: get all orders
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = status ? 'WHERE o.status = ?' : '';
    const params = status ? [status] : [];

    const [orders] = await pool.query(`
      SELECT o.*, u.name as user_name, u.email as user_email, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${where}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, tracking_number } = req.body;
    await pool.query('UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?',
      [status, tracking_number || null, req.params.id]);
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMyOrders, getOrderById, validateDiscount, getAllOrders, updateOrderStatus };