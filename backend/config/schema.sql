-- Run this file in your MySQL client to set up the Aurora database
-- mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS aurora_db;
USE aurora_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  category_id INT,
  stock INT DEFAULT 0,
  is_featured TINYINT(1) DEFAULT 0,
  is_new_arrival TINYINT(1) DEFAULT 0,
  is_on_sale TINYINT(1) DEFAULT 0,
  sale_percent INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product variants (size, colour etc)
CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  variant_type VARCHAR(50) NOT NULL,
  variant_value VARCHAR(100) NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  stock INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  status ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded') DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  shipping_name VARCHAR(100),
  shipping_email VARCHAR(100),
  shipping_phone VARCHAR(20),
  shipping_address TEXT,
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_pincode VARCHAR(20),
  tracking_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT,
  product_name VARCHAR(200),
  product_image VARCHAR(255),
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  body TEXT,
  is_verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_review (user_id, product_id)
);

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wishlist (user_id, product_id)
);

-- Discount codes
CREATE TABLE IF NOT EXISTS discounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('percentage', 'fixed') NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed: default admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Aurora Admin', 'admin@aurora.com', '$2a$10$rQnm1d5LZ5K5Z5K5Z5K5ZuHqq8K5Z5K5Z5K5Z5K5Z5K5Z5K5Z5K5', 'admin');

-- Seed: categories
INSERT IGNORE INTO categories (name, slug, description, image_url) VALUES
('Clothing', 'clothing', 'Soft knits and everyday staples', 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400'),
('Home & Decor', 'home-decor', 'Candles, vases and cozy accents', 'https://images.unsplash.com/photo-1603912699214-92627f304eb6?w=400'),
('Accessories', 'accessories', 'Bags, jewelry and timeless pieces', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400'),
('Lifestyle', 'lifestyle', 'Journals, mugs and daily essentials', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400');

-- Seed: sample products
INSERT IGNORE INTO products (name, slug, description, price, compare_price, category_id, stock, is_featured, is_new_arrival) VALUES
('Essential Knit Sweater', 'essential-knit-sweater', 'A timeless chunky knit sweater in warm neutral tones. Made from sustainably sourced wool blend.', 48.00, 65.00, 1, 25, 1, 1),
('Vanilla & Amber Candle', 'vanilla-amber-candle', 'Hand-poured soy wax candle with notes of vanilla, amber and warm sandalwood. Burns for 45 hours.', 28.00, NULL, 2, 50, 1, 1),
('Classic Canvas Tote', 'classic-canvas-tote', 'Sturdy canvas tote with leather handles. Perfect for market runs or everyday carry.', 36.00, NULL, 3, 30, 0, 1),
('The Heritage Watch', 'heritage-watch', 'Minimalist leather-strap watch with sapphire crystal face. Timeless design meets modern movement.', 75.00, 95.00, 3, 10, 1, 1),
('Linen Throw Pillow', 'linen-throw-pillow', 'Stonewashed linen pillow cover in earthy tones. Removable cover, 50x50cm.', 32.00, NULL, 2, 40, 0, 0),
('Ceramic Coffee Mug', 'ceramic-coffee-mug', 'Hand-thrown ceramic mug with speckled glaze. Each piece is unique.', 24.00, NULL, 4, 35, 1, 0);

-- Seed: product images
INSERT IGNORE INTO product_images (product_id, image_url, is_primary) VALUES
(1, 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600', 1),
(2, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600', 1),
(3, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600', 1),
(4, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', 1),
(5, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600', 1),
(6, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600', 1);

-- Seed: discount code
INSERT IGNORE INTO discounts (code, type, value, min_order_amount) VALUES
('AURORA10', 'percentage', 10, 50),
('WELCOME20', 'fixed', 20, 100);