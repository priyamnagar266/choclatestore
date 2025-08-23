// Lightweight MongoDB client wrapper for Netlify Functions (cold start optimized)
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME || 'cokhaenergyfoods';

if (!uri) {
  console.warn('[functions/lib/db] MONGODB_URI not set. Functions needing DB will fail.');
}

let cached = globalThis.__MONGO_CLIENT__;

export async function getDb() {
  if (!uri) throw new Error('MONGODB_URI missing');
  if (!cached) {
    const client = new MongoClient(uri, { maxPoolSize: 3 });
    cached = await client.connect();
    globalThis.__MONGO_CLIENT__ = cached;
  }
  return cached.db(dbName);
}
