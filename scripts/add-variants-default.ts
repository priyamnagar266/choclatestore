import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

/*
 * Adds default 30g / 60g variants to products that currently have no variants array
 * or have an empty variants array. Skips products already having variants.
 *
 * Rules (customize if needed):
 *  - If product has a salePrice (< price) we distribute proportionally.
 *  - Derive 30g price as current base price (assumed to represent smaller pack) if price < 100, otherwise
 *    try to split: if price seems like a 60g-only price (heuristic), set 30g = Math.round(price * 0.6).
 *  - 60g price = Math.round(30g price * 1.8) by default unless that would exceed current price by >20%; then clamp.
 *  - After adding variants, we set product.price to min(variant.price) and product.salePrice to min(variant.salePrice) if any.
 *
 * Simpler override option: set both variants from fixed ratios and ignore heuristics
 *   (uncomment SIMPLE_MODE constant below if you want deterministic behavior).
 */

// const SIMPLE_MODE = true; // enable for flat mapping strategy

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DBNAME || new URL(uri).pathname.replace('/', '') || undefined;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = dbName ? client.db(dbName) : client.db();
    const productsColl = db.collection<any>('products');

    const products = await productsColl.find({ $or: [ { variants: { $exists: false } }, { variants: { $size: 0 } } ] }).toArray();
    if (!products.length) {
      console.log('No products without variants found. Nothing to do.');
      return;
    }

    let updated = 0;
    for (const p of products) {
      const basePrice: number = p.price || 0;
      const baseSale: number | undefined = p.salePrice && p.salePrice < basePrice ? p.salePrice : undefined;

      let price30: number;
      let price60: number;
      if (basePrice <= 0) {
        // Skip invalid price product
        console.warn('Skipping product with non-positive price', p._id || p.id, basePrice);
        continue;
      }

      // Heuristic vs simple mode
      // if (SIMPLE_MODE) { price30 = basePrice; price60 = Math.round(basePrice * 1.8); }
      // else heuristic below:
      if (basePrice < 120) {
        price30 = basePrice; // assume existing price is for smaller pack
        price60 = Math.round(price30 * 1.8);
      } else {
        // Assume existing price maybe for larger pack, back-calculate smaller
        price60 = basePrice;
        price30 = Math.round(price60 * 0.6);
        if (price30 < 30) price30 = Math.max(30, Math.round(price60 / 3));
      }

      // Adjust if 60g ended up way lower than 30g (edge guard)
      if (price60 <= price30) price60 = price30 + Math.max(10, Math.round(price30 * 0.3));

      let sale30: number | undefined;
      let sale60: number | undefined;
      if (baseSale) {
        // Maintain similar discount percentage
        const discountPct = (basePrice - baseSale) / basePrice;
        sale30 = Math.round(price30 * (1 - discountPct));
        sale60 = Math.round(price60 * (1 - discountPct));
        if (sale30 >= price30) sale30 = price30 - 1; // ensure strictly lower
        if (sale60 >= price60) sale60 = price60 - 1;
      }

      const variants = [
        { label: '30g', price: price30, ...(sale30 && sale30 > 0 ? { salePrice: sale30 } : {}) },
        { label: '60g', price: price60, ...(sale60 && sale60 > 0 ? { salePrice: sale60 } : {}) },
      ];

      const newProductPrice = Math.min(price30, price60);
      const newProductSale = [sale30, sale60].filter(v => typeof v === 'number').reduce((min, v) => v! < min ? v! : min, Infinity);

      const updateDoc: any = { variants, price: newProductPrice };
      if (isFinite(newProductSale)) updateDoc.salePrice = newProductSale;

      await productsColl.updateOne({ _id: p._id }, { $set: updateDoc });
      updated++;
      console.log(`[UPDATED] ${p._id || p.id} -> variants added 30g/60g`);
    }

    console.log(`Done. Added variants to ${updated} products.`);
  } catch (e) {
    console.error('Variant migration failed', e);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
