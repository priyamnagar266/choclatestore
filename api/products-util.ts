// Utility for product DB access (server environment)
import clientPromise from './_db';
import type { Product } from '../shared/schema';

export async function getProducts(): Promise<Product[]> {
  const client = await clientPromise;
  const db = client.db();
  const products = await db.collection<Product>('products').find().toArray();
  return products;
}
