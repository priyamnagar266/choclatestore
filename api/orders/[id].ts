import clientPromise from '../../_db';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await clientPromise;
  const db = client.db();
  const ordersCol = db.collection('orders');
  const { id } = req.query;
  let _id;
  try {
    _id = new ObjectId(id as string);
  } catch {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  if (req.method === 'GET') {
    const order = await ordersCol.findOne({ _id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(order);
    return;
  }

  if (req.method === 'PUT') {
    const data = req.body;
    await ordersCol.updateOne({ _id }, { $set: data });
    const updated = await ordersCol.findOne({ _id });
    res.status(200).json(updated);
    return;
  }

  if (req.method === 'DELETE') {
    await ordersCol.deleteOne({ _id });
    res.status(204).end();
    return;
  }

  res.status(405).json({ message: 'Method Not Allowed' });
}
