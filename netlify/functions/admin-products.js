// Admin products pagination/search via Netlify Function
import { getDb } from './lib/db.js';
import { verifyAdmin, json, handleOptions } from './lib/auth.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  const auth = verifyAdmin(event); if (auth.error) return json(auth.error.statusCode,{ message: auth.error.message });
  const db = await getDb();
  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const page = Math.max(1, parseInt(params.page || '1',10));
      const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize || '20',10)));
      const search = params.search || '';
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
  if (event.httpMethod === 'PUT') {
    try {
      // Try to get id from /admin-products/:id or ?id=...
      let id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id && event.path) {
        // Netlify passes path like '/.netlify/functions/admin-products/1'
        const pathParts = event.path.split('/');
        const maybeId = pathParts[pathParts.length - 1];
        if (/^\d+$/.test(maybeId)) id = maybeId;
      }
      if (!id) return json(400, { message: 'Product id required' });
      const body = event.body ? JSON.parse(event.body) : {};
      // Only allow updating specific fields
      const updateFields = {};
      if (typeof body.netWeight === 'string') updateFields.netWeight = body.netWeight;
      if (typeof body.name === 'string') updateFields.name = body.name;
      if (typeof body.price === 'number') updateFields.price = body.price;
      if (typeof body.salePrice === 'number') updateFields.salePrice = body.salePrice;
      if (typeof body.category === 'string') updateFields.category = body.category;
      if (typeof body.inStock === 'number') updateFields.inStock = body.inStock;
      if (typeof body.image === 'string') updateFields.image = body.image;
      if (Object.keys(updateFields).length === 0) return json(400, { message: 'No valid fields to update' });
      const res = await db.collection('products').updateOne({ id: Number(id) }, { $set: updateFields });
      if (res.modifiedCount === 1) {
        return json(200, { message: 'Product updated', id, updateFields });
      } else {
        return json(404, { message: 'Product not found or not updated' });
      }
    } catch (e) {
      return json(500, { message: 'Failed to update product', error: e.message });
    }
  }
  return json(405, { message: 'Method Not Allowed' });
}