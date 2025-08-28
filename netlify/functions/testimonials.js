// Netlify Function: testimonials list (replaces Render /api/testimonials)
// Endpoint: /.netlify/functions/testimonials (redirected from /api/testimonials)
// Returns active testimonials with caching + ETag. Falls back to a static set if DB empty.
import { getDb } from './lib/db.js';
import crypto from 'crypto';

let cache = { data: null, ts: 0, etag: '' };
const MAX_AGE_MS = 5 * 60_000; // 5 minutes (testimonials change rarely)
const FALLBACK = [
  { text:"These energy bars have completely changed my afternoon slump. The Focus Boost bar gives me 4+ hours of sustained mental clarity without any crash!", name:"Priya Sharma", role:"Software Engineer", rating:5 },
  { text:"As a fitness enthusiast, I love the Protein Power bar. It's perfectly balanced nutrition with authentic Indian flavors. Finally, a healthy snack that tastes amazing!", name:"Rahul Kumar", role:"Fitness Coach", rating:5 },
  { text:"The Mood Uplift bar has become my daily stress-buster. I can feel the difference in my mood and energy levels. These are not just snacks, they're wellness in a bar!", name:"Anita Desai", role:"Marketing Executive", rating:5 },
];

export async function handler(event) {
  try {
    const now = Date.now();
    const ifNoneMatch = event.headers && (event.headers['if-none-match'] || event.headers['If-None-Match']);

    if (cache.data && (now - cache.ts < MAX_AGE_MS)) {
      if (ifNoneMatch && cache.etag && ifNoneMatch === cache.etag) {
        return { statusCode: 304, headers: { 'ETag': cache.etag } };
      }
      return ok(cache.data, cache.etag);
    }

    const db = await getDb();
    // Ensure supporting index (active + order + createdAt) for efficient query
    db.collection('testimonials').createIndex({ active:1, order:1, createdAt:-1 }).catch(()=>{});
    const list = await db.collection('testimonials')
      .find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .toArray();

    const data = (list && list.length) ? list : FALLBACK;
    const hashBase = data.map(t => `${t._id || t.name}:${t.updatedAt || ''}:${t.order || ''}`).join('|');
    const etagRaw = crypto.createHash('sha1').update(hashBase).digest('base64').slice(0,16);
    const etag = 'W/"' + etagRaw + '"';

    cache = { data, ts: now, etag };

    if (ifNoneMatch && ifNoneMatch === etag) {
      return { statusCode: 304, headers: { 'ETag': etag } };
    }

    return ok(data, etag);
  } catch (e) {
    // Fallback to static list on error
    if (cache.data) {
      return ok(cache.data, cache.etag);
    }
    const hashBase = FALLBACK.map(t => t.name).join('|');
    const etag = 'W/"' + crypto.createHash('sha1').update(hashBase).digest('base64').slice(0,16) + '"';
    return ok(FALLBACK, etag, 200, true, e.message);
  }
}

function ok(data, etag, status=200){
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'ETag': etag
    },
    body: JSON.stringify(data)
  };
}
