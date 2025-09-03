// Netlify Function: Combined admin dashboard data (overview + metrics + recent orders + sales report)
// Redirect suggestion: map /api/admin/dashboard-data -> /.netlify/functions/admin-dashboard
// Auth: Bearer JWT with role=admin required.
import jwt from 'jsonwebtoken';
import { getDb } from './lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function unauthorized(message='Unauthorized'){ return { statusCode:401, body: JSON.stringify({ message }) }; }
function forbidden(message='Forbidden'){ return { statusCode:403, body: JSON.stringify({ message }) }; }
function json(statusCode, data){ return { statusCode, headers:{ 'Content-Type':'application/json','Cache-Control':'no-store' }, body: JSON.stringify(data) }; }

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers:{ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS' }, body:'' };
  if (event.httpMethod !== 'GET') return json(405,{ message:'Method Not Allowed' });

  const auth = event.headers['authorization'] || event.headers['Authorization'];
  if (!auth?.startsWith('Bearer ')) return unauthorized('Missing token');
  let payload;
  try { payload = jwt.verify(auth.slice(7), JWT_SECRET); } catch { return unauthorized('Invalid token'); }
  if (!payload || typeof payload !== 'object' || payload.role !== 'admin') return forbidden('Admin only');

  try {
    const db = await getDb();
    // Collections
    const ordersCol = db.collection('orders');
    const productsCol = db.collection('products');
    const usersCol = db.collection('users');

    // Parallel fetch base metrics
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1);

    const [ totalOrders, totalRevenueAgg, recentOrdersRaw, productsCount, usersCount ] = await Promise.all([
      ordersCol.countDocuments({}),
      ordersCol.aggregate([{ $group:{ _id:null, total:{ $sum:'$total' } } }]).toArray(),
      ordersCol.find({}).sort({ createdAt: -1 }).limit(10).toArray(),
      productsCol.countDocuments({}),
      usersCol.countDocuments({})
    ]);
    const totalRevenue = (totalRevenueAgg[0]?.total) || 0;

    // Monthly sales for last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth()-5, 1);
    const monthlyRaw = await ordersCol.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: '$total' }, count: { $sum:1 } } },
      { $sort: { '_id.y':1, '_id.m':1 } }
    ]).toArray();
    const monthlySales = monthlyRaw.map(r => ({ month: `${r._id.y}-${String(r._id.m).padStart(2,'0')}`, total: r.total, orders: r.count }));

    // Top products (by revenue last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
    const topProductsRaw = await ordersCol.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', revenue: { $sum: { $multiply: ['$items.price','$items.quantity'] } }, qty: { $sum: '$items.quantity' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]).toArray();
    const topProducts = topProductsRaw.map(p => ({ productId: p._id, revenue: p.revenue, quantity: p.qty }));

    // Recent orders normalized
    const recentOrders = recentOrdersRaw.map(o => ({
      id: o._id?.toString?.() || o.id,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      total: o.total,
      status: o.status || 'placed',
      createdAt: o.createdAt,
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    }));

    // Compose response
    return json(200, {
      overview: { totalOrders, totalRevenue, productsCount, usersCount },
      metrics: { recentOrders },
      sales: { monthlySales, topProducts }
    });
  } catch (e){
    return json(500,{ message:'Failed to load admin dashboard', error: e.message });
  }
}