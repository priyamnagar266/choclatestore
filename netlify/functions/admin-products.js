// Admin products pagination/search via Netlify Function
import { getDb } from './lib/db.js';
import { verifyAdmin, json, handleOptions } from './lib/auth.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'GET') return json(405,{ message:'Method Not Allowed' });
  const auth = verifyAdmin(event); if (auth.error) return json(auth.error.statusCode,{ message: auth.error.message });
  try {
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1',10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20',10)));
    const search = params.search || '';
    const db = await getDb();
    const query = search ? { $or: [ { name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }, { category: { $regex: search, $options: 'i' } } ] } : {};
    const skip = (page - 1) * pageSize;
    const [ total, products ] = await Promise.all([
      db.collection('products').countDocuments(query),
      db.collection('products').find(query).sort({ id:1 }).skip(skip).limit(pageSize).toArray()
    ]);
    return json(200,{ products, total, page, pageSize });
  } catch (e) {
    return json(500,{ message:'Failed to load products', error: e.message });
  }
}