const { pool } = require('../config/db');

const getProducts = async (req, res) => {
  try {
    const { category, search, sort, minPrice, maxPrice, page = 1, limit = 12, featured, newArrival, sale } = req.query;
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    let params = [];

    if (category) { where.push('c.slug = ?'); params.push(category); }
    if (search) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (minPrice) { where.push('p.price >= ?'); params.push(minPrice); }
    if (maxPrice) { where.push('p.price <= ?'); params.push(maxPrice); }
    if (featured === 'true') { where.push('p.is_featured = 1'); }
    if (newArrival === 'true') { where.push('p.is_new_arrival = 1'); }
    if (sale === 'true') { where.push('p.is_on_sale = 1'); }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price DESC';
    else if (sort === 'name') orderBy = 'p.name ASC';
    else if (sort === 'popular') orderBy = 'avg_rating DESC';

    const whereStr = where.join(' AND ');

    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
        img.image_url as primary_image,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = 1
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE ${whereStr}
      GROUP BY p.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as total FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereStr}
    `, params);

    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.slug = ?
      GROUP BY p.id
    `, [req.params.slug]);

    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    const product = rows[0];

    const [images] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [product.id]);
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [product.id]);
    const [reviews] = await pool.query(`
      SELECT r.*, u.name as user_name FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 10
    `, [product.id]);

    // Related products
    const [related] = await pool.query(`
      SELECT p.*, img.image_url as primary_image
      FROM products p
      LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = 1
      WHERE p.category_id = ? AND p.id != ?
      LIMIT 4
    `, [product.category_id, product.id]);

    res.json({ ...product, images, variants, reviews, related });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, compare_price, category_id, stock, is_featured, is_new_arrival, is_on_sale, sale_percent } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

    const [result] = await pool.query(`
      INSERT INTO products (name, slug, description, price, compare_price, category_id, stock, is_featured, is_new_arrival, is_on_sale, sale_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, slug, description, price, compare_price || null, category_id, stock || 0, is_featured || 0, is_new_arrival || 0, is_on_sale || 0, sale_percent || 0]);

    res.status(201).json({ id: result.insertId, slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, description, price, compare_price, category_id, stock, is_featured, is_new_arrival, is_on_sale, sale_percent } = req.body;
    await pool.query(`
      UPDATE products SET name=?, description=?, price=?, compare_price=?, category_id=?,
      stock=?, is_featured=?, is_new_arrival=?, is_on_sale=?, sale_percent=? WHERE id=?
    `, [name, description, price, compare_price || null, category_id, stock, is_featured || 0, is_new_arrival || 0, is_on_sale || 0, sale_percent || 0, req.params.id]);
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addProductImage = async (req, res) => {
  try {
    const { image_url, is_primary } = req.body;
    if (is_primary) await pool.query('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [req.params.id]);
    await pool.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)', [req.params.id, image_url, is_primary ? 1 : 0]);
    res.status(201).json({ message: 'Image added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProducts, getProductBySlug, createProduct, updateProduct, deleteProduct, addProductImage };