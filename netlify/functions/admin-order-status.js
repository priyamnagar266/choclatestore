// Admin order status update (PATCH) at /api/admin/orders/:id/status
import { getDb } from './lib/db.js';
import { verifyAdmin, json, handleOptions } from './lib/auth.js';

const ALLOWED = ['placed','shipped','out_for_delivery','delivered','cancelled'];

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'PATCH') return json(405,{ message:'Method Not Allowed' });
  const auth = verifyAdmin(event); if (auth.error) return json(auth.error.statusCode,{ message: auth.error.message });
  try {
    // event.path ends with /.netlify/functions/admin-order-status/<id>/status or via redirect /api/admin/orders/<id>/status
    const rawPath = event.rawUrl || event.path || '';
    // Extract the segment before /status
    let id = ''; const parts = rawPath.split('/');
    for (let i = parts.length -1; i>=0; i--) { if (parts[i] === 'status' && i>0){ id = parts[i-1]; break; } }
    if (!id) return json(400,{ message:'Order id not found in path' });
    const body = JSON.parse(event.body || '{}');
    const status = body.status;
    if (!ALLOWED.includes(status)) return json(400,{ message:'Invalid status' });
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    let updated = false;
    try {
      const res = await db.collection('orders').updateOne({ _id: new ObjectId(id) }, { $set: { status } });
      updated = res.modifiedCount === 1;
    } catch {
      const res = await db.collection('orders').updateOne({ id }, { $set: { status } });
      updated = res.modifiedCount === 1;
    }
    if (!updated) return json(404,{ message:'Order not found' });
    return json(200,{ success:true });
  } catch (e){
    return json(500,{ message:'Failed to update status', error: e.message });
  }
}