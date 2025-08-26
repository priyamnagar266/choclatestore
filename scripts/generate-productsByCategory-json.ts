import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env (explicit path for reliability when run via npm scripts)
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing. Ensure it is set in .env or environment variables before running generate:productsByCategory');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DBNAME || new URL(uri).pathname.replace('/', '') || undefined;
    const db = dbName ? client.db(dbName) : client.db();
    const products = await db.collection('products').find().sort({ id: 1 }).toArray();
    // Group products by category
    const byCategory: Record<string, any[]> = {};
    for (const product of products) {
      const cat = product.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(product);
    }
    const outDir = path.join(process.cwd(), 'client', 'public');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const json = JSON.stringify(byCategory, null, 2);
    const outFile = path.join(outDir, 'productsByCategory.json');
    fs.writeFileSync(outFile, json);
    console.log('Generated', outFile, 'with', Object.keys(byCategory).length, 'categories.');
  } catch (e) {
    console.error('Generate productsByCategory.json failed', e);
    process.exit(1);
  } finally {
    await client.close();
  }
}
main();
