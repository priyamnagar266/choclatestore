import { getProducts } from './products-util';


export default async function handler(req: any, res: any) {
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
