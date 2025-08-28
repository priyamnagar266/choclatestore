// Netlify Function: fetch single product by slug
// Expected path: /.netlify/functions/products-slug/{slug}
// Optionally map /api/products/slug/* to this in netlify.toml
import { getDb } from './lib/db.js';

export async function handler(event, context) {
  const slug = event.path.split('/').pop();
  if (!slug) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing slug' }) };
  }
  try {
    const db = await getDb();
    const product = await db.collection('products').findOne({ slug });
    if (!product) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Product not found' }) };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(product)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Error fetching product', error: e.message }) };
  }
}
