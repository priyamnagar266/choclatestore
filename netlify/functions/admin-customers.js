// Admin customers listing with order stats
import { getDb } from './lib/db.js';
import { verifyAdmin, json, handleOptions } from './lib/auth.js';

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return json(405,{ message:'Method Not Allowed' });
  const auth = verifyAdmin(event); if (auth.error) return json(auth.error.statusCode,{ message: auth.error.message });
  try {
    const p = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(p.page || '1',10));
    const pageSize = Math.min(100, Math.max(1, parseInt(p.pageSize || '20',10)));
    const search = p.search || '';
    const startDate = p.startDate; const endDate = p.endDate;
    const db = await getDb();
    const match = {};
    if (search) Object.assign(match, { $or: [ { name: { $regex: search, $options:'i'} }, { email: { $regex: search, $options:'i'} } ] });
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) match.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    const skip = (page - 1) * pageSize;
    const pipeline = [
      { $match: match },
      { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'ordersRaw' } },
      { $addFields: { ordersCount: { $size: '$ordersRaw' }, totalSpend: { $sum: { $map: { input: '$ordersRaw', as: 'o', in: { $ifNull: ['$$o.total',0] } } } } } },
      { $project: { password:0, ordersRaw:0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize }
    ];
    const countPipeline = [ { $match: match }, { $count: 'total' } ];
    const [ rows, countRes ] = await Promise.all([
      db.collection('users').aggregate(pipeline).toArray(),
      db.collection('users').aggregate(countPipeline).toArray()
    ]);
    const total = countRes[0]?.total || 0;
    const customers = rows.map(r => ({ id: r._id?.toString?.(), name: r.name, email: r.email, createdAt: r.createdAt, ordersCount: r.ordersCount, totalSpend: r.totalSpend, role: r.role }));
    return json(200,{ customers, total, page, pageSize });
  } catch (e){
    return json(500,{ message:'Failed to load customers', error: e.message });
  }
}