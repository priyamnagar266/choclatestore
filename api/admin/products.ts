
import clientPromise from '../_db';

export default async function handler(req: any, res: any) {
  const client = await clientPromise;
  const db = client.db();
  const productsCol = db.collection('products');

  if (req.method === 'GET') {
    // List products (with optional search/pagination)
    const { page = '1', pageSize = '20', search = '' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const sizeNum = parseInt(pageSize as string) || 20;
    const query: any = search ? { name: { $regex: search, $options: 'i' } } : {};
    const total = await productsCol.countDocuments(query);
    const products = await productsCol.find(query).skip((pageNum-1)*sizeNum).limit(sizeNum).toArray();
    res.status(200).json({ products, total, page: pageNum, pageSize: sizeNum });
    return;
  }

  if (req.method === 'POST') {
    // Create product
    const data = req.body;
    // Auto-increment id
    const max = await productsCol.find().sort({id:-1}).limit(1).toArray();
    const nextId = max.length ? (max[0].id || 0) + 1 : 1;
    const doc = { id: nextId, ...data };
    await productsCol.insertOne(doc);
    res.status(201).json(doc);
    return;
  }

  res.status(405).json({ message: 'Method Not Allowed' });
}
