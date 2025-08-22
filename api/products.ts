import { getProducts } from './products-util';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }
  try {
    const products = await getProducts();
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching products: ' + (error?.message || String(error)) });
  }
}
