
import clientPromise from '../../_db';

export default async function handler(req: any, res: any) {
  const client = await clientPromise;
  const db = client.db();
  const productsCol = db.collection('products');
  const { id } = req.query;
  const numId = Number(id);

  if (req.method === 'GET') {
    const product = await productsCol.findOne({ id: numId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
    return;
  }

  if (req.method === 'PUT') {
    const data = req.body;
    await productsCol.updateOne({ id: numId }, { $set: data });
    const updated = await productsCol.findOne({ id: numId });
    res.status(200).json(updated);
    return;
  }

  if (req.method === 'DELETE') {
    await productsCol.deleteOne({ id: numId });
    res.status(204).end();
    return;
  }

  res.status(405).json({ message: 'Method Not Allowed' });
}
