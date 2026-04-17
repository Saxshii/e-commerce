const { pool } = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const [[{ total_revenue }]] = await pool.query("SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE status != 'cancelled'");
    const [[{ total_orders }]] = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
    const [[{ total_products }]] = await pool.query('SELECT COUNT(*) as total_products FROM products');
    const [[{ total_users }]] = await pool.query("SELECT COUNT(*) as total_users FROM users WHERE role = 'user'");

    const [recentOrders] = await pool.query(`
      SELECT o.id, o.total, o.status, o.created_at, u.name as user_name, u.email as user_email
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 5
    `);

    const [monthlySales] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%b') as month, SUM(total) as revenue, COUNT(*) as orders
      FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY created_at
    `);

    const [topProducts] = await pool.query(`
      SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi JOIN products p ON oi.product_id = p.id
      GROUP BY p.id ORDER BY sold DESC LIMIT 5
    `);

    res.json({ total_revenue, total_orders, total_products, total_users, recentOrders, monthlySales, topProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
        COUNT(DISTINCT o.id) as order_count, COALESCE(SUM(o.total), 0) as total_spent
      FROM users u LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'user' GROUP BY u.id ORDER BY total_spent DESC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDiscounts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM discounts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createDiscount = async (req, res) => {
  try {
    const { code, type, value, min_order_amount, max_uses, expires_at } = req.body;
    await pool.query('INSERT INTO discounts (code, type, value, min_order_amount, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [code.toUpperCase(), type, value, min_order_amount || 0, max_uses || null, expires_at || null]);
    res.status(201).json({ message: 'Discount created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardStats, getCustomers, getDiscounts, createDiscount };