// Netlify Function: Track Orders by Email (public, unauthenticated)
// Endpoint: /.netlify/functions/orders-track (redirected from /api/orders/track)
// Request: POST JSON { email } OR query param ?email=
// Response: { orders: [ { orderId, status, createdAt, total, items:[{productId,quantity,name,image}], eta } ] }

import { getDb } from './lib/db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { message: 'Method Not Allowed' });
  }
  try {
    let email = undefined;
    try {
      if (event.body) {
        const parsed = JSON.parse(event.body);
        email = parsed.email || parsed.customerEmail;
      }
    } catch {}
    if (!email) {
      const params = event.queryStringParameters || {};
      email = params.email;
    }
    if (typeof email !== 'string') return jsonResponse(400, { message: 'Email required' });
    email = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonResponse(400, { message: 'Invalid email' });

    const db = await getDb();
    const ordersCol = db.collection('orders');
    const productsCol = db.collection('products');

    // Parallel fetch orders + lightweight product list for enrichment
    const [raw, products] = await Promise.all([
      ordersCol.find({ customerEmail: email }).sort({ createdAt: -1 }).limit(25).toArray(),
      productsCol.find({}, { projection: { _id: 1, id: 1, name: 1, image: 1, price: 1 } }).toArray()
    ]);

    if (!raw.length) return jsonResponse(200, { orders: [] });

    const productMap = {};
    for (const p of products) {
      if (p.id !== undefined) productMap[String(p.id)] = p;
      if (p._id) productMap[String(p._id)] = p;
    }

    const orders = raw.map(o => ({
      orderId: o._id?.toString?.() || o.id || o.orderId,
      status: o.status || 'placed',
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
      total: o.total,
      items: Array.isArray(o.items) ? o.items.slice(0, 5).map(it => {
        const prod = productMap[String(it.productId)] || productMap[String(parseInt(it.productId))];
        return { productId: it.productId, quantity: it.quantity, name: prod?.name, image: prod?.image };
      }) : [],
      eta: (() => { // naive ETA: createdAt + 5 days
        try { if (o.createdAt) { const d = new Date(o.createdAt); d.setDate(d.getDate() + 5); return d.toISOString(); } } catch {}
        return null;
      })()
    }));

    return jsonResponse(200, { orders });
  } catch (e) {
    console.error('[orders-track] error', e);
    return jsonResponse(500, { message: 'Failed to track orders' });
  }
};

function jsonResponse(statusCode, data) {
  return { statusCode, headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
