// Netlify Function: products list (replaces Render /api/products)
// Endpoint: /.netlify/functions/products-list (redirected from /api/products)
// Adds lightweight in-memory cache per function container to reduce cold DB hits.
import { getDb } from './lib/db.js';
import crypto from 'crypto';

let cache = { data: null, ts: 0, etag: '' };
const MAX_AGE_MS = 60_000; // 1 minute freshness window

export async function handler(event, context) {
  try {
    const now = Date.now();
    const ifNoneMatch = event.headers && (event.headers['if-none-match'] || event.headers['If-None-Match']);

    // Serve from cache if fresh
    if (cache.data && (now - cache.ts < MAX_AGE_MS)) {
      if (ifNoneMatch && cache.etag && ifNoneMatch === cache.etag) {
        return { statusCode: 304, headers: { 'ETag': cache.etag } };
      }
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
          'ETag': cache.etag
        },
        body: JSON.stringify(cache.data)
      };
    }

  // Fetch fresh from MongoDB
  const db = await getDb();
  // Fire-and-forget index to optimize future ETag hash queries (safe if exists)
  db.collection('products').createIndex({ updatedAt: 1 }).catch(()=>{});
  const products = await db.collection('products').find().sort({ id: 1 }).toArray();

    // Compute weak ETag hash
    const hashBase = products.map(p => `${p._id}:${p.updatedAt || ''}:${p.price}`).join('|');
    const etagRaw = crypto.createHash('sha1').update(hashBase).digest('base64').slice(0,16);
    const etag = 'W/"' + etagRaw + '"';

    cache = { data: products, ts: now, etag };

    if (ifNoneMatch && ifNoneMatch === etag) {
      return { statusCode: 304, headers: { 'ETag': etag } };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
        'ETag': etag
      },
      body: JSON.stringify(products)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Error fetching products', error: e.message }) };
  }
}
