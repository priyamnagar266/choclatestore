import clientPromise from './_db';


export default async function handler(_req: any, res: any) {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.command({ ping: 1 });
    const productCount = await db.collection('products').countDocuments();
    res.status(200).json({ status: 'ok', timestamp: Date.now(), db: { connected: true, productCount } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', error: e?.message || String(e) });
  }
}
