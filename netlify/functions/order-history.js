// Netlify Function: Fetch Order History (serverless, low latency)
// Supports lookup by userId (preferred) or customerEmail.
// Auth (optional): Provide Bearer JWT in Authorization header; if present and contains id/email it overrides query params.
// Query params:
//   userId=<mongodb object id or stored user id string>
//   email=<customer email>
//   page=<number, default 1>
//   pageSize=<number, max 50, default 10>
// Response: { success, page, pageSize, total, orders: [...] }

import jwt from 'jsonwebtoken';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const params = event.queryStringParameters || {};
    let { userId, email } = params;
    let page = parseInt(params.page || '1', 10);
    let pageSize = parseInt(params.pageSize || '10', 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
    if (pageSize > 50) pageSize = 50;

    // Optional JWT override
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET || 'supersecretkey';
      try {
        const decoded = jwt.verify(token, secret);
        if (decoded && typeof decoded === 'object') {
          if (decoded.id) userId = decoded.id;
          if (decoded.email) email = decoded.email;
        }
      } catch (e) {
        console.warn('[order-history] JWT verify failed', e.message);
      }
    }

    if (!userId && !email) {
      return jsonResponse(400, { error: 'userId or email is required' });
    }

    const { getDb } = await import('./lib/db.js');
    const db = await getDb();
    const ordersCol = db.collection('orders');

    const query = {};
    if (userId) {
      // Match either raw string or ObjectId stored as string. We store userId as provided in existing backend.
      query.userId = userId;
    } else if (email) {
      query.customerEmail = email;
    }

    const total = await ordersCol.countDocuments(query);
    const skip = (page - 1) * pageSize;
    const cursor = ordersCol.find(query, { projection: { /* limit heavy fields if any later */ } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    const docs = await cursor.toArray();

    // Normalize _id to string id
    const orders = docs.map(o => ({ ...o, _id: o._id?.toString?.() }));

    return jsonResponse(200, { success: true, page, pageSize, total, orders });
  } catch (err) {
    console.error('[order-history] error', err);
    return jsonResponse(500, { success: false, error: err?.message || 'Internal error' });
  }
};

function jsonResponse(statusCode, data) {
  return { statusCode, headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
}
