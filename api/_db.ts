/// <reference types="node" />
// Vercel-optimized MongoDB connection utility
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env or Vercel environment variables');
}

// Use globalThis for compatibility in all JS environments
type MongoGlobal = typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
const mongoGlobal = globalThis as MongoGlobal;

if (process.env.NODE_ENV === 'development') {
  // In dev, use a global variable so the value is preserved across hot reloads
  if (!mongoGlobal._mongoClientPromise) {
    client = new MongoClient(uri);
    mongoGlobal._mongoClientPromise = client.connect();
  }
  clientPromise = mongoGlobal._mongoClientPromise!;
} else {
  // In production, create a new client for every invocation
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
