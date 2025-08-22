import clientPromise from './_db';


export default async function handler(req: any, res: any) {
  const client = await clientPromise;
  const db = client.db();
  const ordersCol = db.collection('orders');

  if (req.method === 'GET') {
    // List orders (optionally filter by user)
    const { userId } = req.query;
    const query: any = userId ? { userId } : {};
    const orders = await ordersCol.find(query).sort({ createdAt: -1 }).toArray();
    res.status(200).json(orders);
    return;
  }

  if (req.method === 'POST') {
    // Create order
    const data = req.body;
    data.createdAt = new Date();
    const result = await ordersCol.insertOne(data);
    res.status(201).json({ ...data, _id: result.insertedId });
    return;
  }

  res.status(405).json({ message: 'Method Not Allowed' });
}
