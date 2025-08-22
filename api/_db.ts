// Vercel-optimized MongoDB connection utility
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env or Vercel environment variables');
}

if (process.env.NODE_ENV === 'development') {
  // In dev, use a global variable so the value is preserved across hot reloads
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri, options);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production, create a new client for every invocation
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
