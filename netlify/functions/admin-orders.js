// Admin orders listing with filters & pagination
import { getDb } from './lib/db.js';
import { verifyAdmin, json, handleOptions } from './lib/auth.js';

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return json(405,{ message:'Method Not Allowed' });
  const auth = verifyAdmin(event); if (auth.error) return json(auth.error.statusCode,{ message: auth.error.message });
  try {
    const q = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(q.page || '1',10));
    const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20',10)));
    const status = q.status; const paymentStatus = q.paymentStatus; const startDate = q.startDate; const endDate = q.endDate;
    const db = await getDb();
    const col = db.collection('orders');
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') {
      if (paymentStatus === 'paid') query.razorpayPaymentId = { $exists: true, $ne: null, $nin: [''] };
      else if (paymentStatus === 'unpaid') query.$or = [ { razorpayPaymentId: { $exists:false } }, { razorpayPaymentId: null }, { razorpayPaymentId:'' } ];
    }
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) range.$lte = new Date(endDate + 'T23:59:59.999Z');
      query.createdAt = range;
    }
    const skip = (page - 1) * pageSize;
    const cursor = col.find(query).sort({ createdAt:-1 }).skip(skip).limit(pageSize);
    const [ ordersRaw, total ] = await Promise.all([ cursor.toArray(), col.countDocuments(query) ]);
    const orders = ordersRaw.map(o => ({
      id: o._id?.toString?.() || o.id,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      total: o.total,
      status: o.status || 'placed',
      paymentStatus: o.razorpayPaymentId ? 'paid' : 'unpaid',
      razorpayPaymentId: o.razorpayPaymentId || null,
      createdAt: o.createdAt,
      items: Array.isArray(o.items) ? o.items.map(it => ({ productId: it.productId, quantity: it.quantity, variantLabel: it.variantLabel, name: it.name, price: it.price })) : []
    }));
    return json(200,{ orders, total, page, pageSize });
  } catch (e){
    return json(500,{ message:'Failed to load orders', error: e.message });
  }
}