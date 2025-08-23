// Netlify Function: Verify Razorpay Payment Signature
// Expects JSON body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Returns { success: boolean, valid: boolean }

import crypto from 'crypto';

// Lazy import DB helper only if order persistence is requested
async function maybeCreateOrder(orderData, razorpayPaymentId) {
  if (!orderData) return null;
  try {
    const { getDb } = await import('./lib/db.js');
    const db = await getDb();
    const orders = db.collection('orders');
    const doc = {
      ...orderData,
      razorpayPaymentId,
      status: orderData.status || 'placed',
      createdAt: new Date(),
    };
    const result = await orders.insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() };
  } catch (e) {
    console.error('[verify-payment] order persistence failed', e);
    return null;
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return jsonResponse(500, { error: 'Razorpay secret not configured' });
    }

    const body = safeParseJson(event.body);
    if (!body) {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse(400, { error: 'Missing required fields' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    let valid = false;
    try {
      // timing safe compare
      const sigBuf = Buffer.from(razorpay_signature, 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        valid = true;
      }
    } catch {
      valid = false;
    }

    if (!valid) {
      return jsonResponse(400, { success: false, valid: false, error: 'Invalid signature' });
    }

    // Optional orderData pass-through for persistence
    let orderRecord = null;
    if (body.orderData && typeof body.orderData === 'object') {
      orderRecord = await maybeCreateOrder(body.orderData, razorpay_payment_id);
    }

    return jsonResponse(200, { success: true, valid: true, order: orderRecord });
  } catch (err) {
    console.error('verify-payment error', err);
    return jsonResponse(500, { success: false, error: err?.message || 'Verification failed' });
  }
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function safeParseJson(str) {
  try { return JSON.parse(str || ''); } catch { return null; }
}
