// Netlify Function: Create Razorpay Order
// Expects JSON body: { amount: number, currency?: string, receiptId?: string, notes?: object }
// amount can be provided in rupees (e.g. 499.99) or in the smallest unit (paise) already.
// If a non-integer is passed we treat it as rupees and convert to paise.

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return jsonResponse(500, { error: 'Razorpay credentials not configured' });
    }

    const body = safeParseJson(event.body);
    if (!body) {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    let { amount, currency = 'INR', receiptId, notes } = body;
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return jsonResponse(400, { error: 'amount is required and must be a number' });
    }

    amount = Number(amount);
    // Convert rupees to paise if looks like a rupee value (non-integer) or clearly small.
    if (!Number.isInteger(amount) || amount < 1000) {
      amount = Math.round(amount * 100); // to paise
    }
    if (amount <= 0) {
      return jsonResponse(400, { error: 'amount must be > 0' });
    }

    const { default: Razorpay } = await import('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount, // amount in paise
      currency,
      receipt: receiptId || `rcpt_${Date.now()}`,
      notes: notes && typeof notes === 'object' ? notes : undefined,
    };

    const order = await razorpay.orders.create(options);
    return jsonResponse(200, { 
      success: true, 
      order,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('create-order error', err);
    const message = err?.error?.description || err?.message || 'Failed to create order';
    return jsonResponse(500, { success: false, error: message });
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
