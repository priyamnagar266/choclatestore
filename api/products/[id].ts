import clientPromise from '../_db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }
  try {
    const { id } = req.query;
    const client = await clientPromise;
    const db = client.db();
    const product = await db.collection('products').findOne({ id: Number(id) });
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching product: ' + (error?.message || String(error)) });
  }
}
