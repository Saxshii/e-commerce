const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/db');

const createCheckoutSession = async (req, res) => {
  try {
    const { items, discountCode, shippingDetails } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'No items in cart' });

    // Verify prices server-side
    const productIds = items.map(i => i.product_id);
    const [products] = await pool.query(
      `SELECT id, name, price FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );
    const productMap = {};
    products.forEach(p => productMap[p.id] = p);

    let discountAmount = 0;
    let discountRow = null;
    if (discountCode) {
      const [drows] = await pool.query('SELECT * FROM discounts WHERE code = ? AND is_active = 1', [discountCode]);
      if (drows.length) {
        discountRow = drows[0];
        const subtotal = items.reduce((sum, i) => sum + (productMap[i.product_id]?.price || 0) * i.quantity, 0);
        discountAmount = discountRow.type === 'percentage'
          ? (subtotal * discountRow.value) / 100
          : discountRow.value;
      }
    }

    const lineItems = items.map(item => {
      const product = productMap[item.product_id];
      return {
        price_data: {
          currency: 'inr',
          product_data: { name: product.name, images: item.image ? [item.image] : [] },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: {
        user_id: req.user?.id || '',
        discount_code: discountCode || '',
        discount_amount: discountAmount.toString(),
        items: JSON.stringify(items.map(i => ({
          product_id: i.product_id,
          variant_id: i.variant_id || null,
          quantity: i.quantity,
          price: productMap[i.product_id]?.price,
          name: productMap[i.product_id]?.name,
          image: i.image || '',
        }))),
        shipping: JSON.stringify(shippingDetails || {}),
      },
    };

    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: 'inr',
        duration: 'once',
        name: discountCode,
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const meta = session.metadata;
      const items = JSON.parse(meta.items);
      const shipping = JSON.parse(meta.shipping || '{}');
      const total = session.amount_total / 100;

      const [orderResult] = await pool.query(`
        INSERT INTO orders (user_id, status, total, discount_amount, stripe_session_id, stripe_payment_intent,
          shipping_name, shipping_email, shipping_address, shipping_city, shipping_pincode)
        VALUES (?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        meta.user_id || null, total, parseFloat(meta.discount_amount) || 0,
        session.id, session.payment_intent,
        shipping.name || session.customer_details?.name || '',
        session.customer_details?.email || '',
        shipping.address || '', shipping.city || '', shipping.pincode || '',
      ]);

      const orderId = orderResult.insertId;
      for (const item of items) {
        await pool.query(`
          INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_image, quantity, price)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [orderId, item.product_id, item.variant_id, item.name, item.image, item.quantity, item.price]);

        await pool.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      if (meta.discount_code) {
        await pool.query('UPDATE discounts SET used_count = used_count + 1 WHERE code = ?', [meta.discount_code]);
      }
    } catch (err) {
      console.error('Webhook order creation failed:', err);
    }
  }

  res.json({ received: true });
};

const getSessionOrder = async (req, res) => {
  try {
    const { session_id } = req.params;
    const [orders] = await pool.query('SELECT * FROM orders WHERE stripe_session_id = ?', [session_id]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orders[0].id]);
    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createCheckoutSession, webhook, getSessionOrder };