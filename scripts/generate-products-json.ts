import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load .env (explicit path for reliability when run via npm scripts)
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Helper to slugify product names
function slugify(raw: string){
  return raw.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing. Ensure it is set in .env or environment variables before running generate:products');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DBNAME || new URL(uri).pathname.replace('/', '') || undefined;
    const db = dbName ? client.db(dbName) : client.db();
    const products = await db.collection('products').find().sort({ id: 1 }).toArray();
    // Ensure each product has a slug (non-persistent here; for persistence use backfill script)
    const slugSet = new Set<string>();
    for (const p of products){
      if (p.slug && typeof p.slug === 'string' && p.slug.trim() !== '') { slugSet.add(p.slug); continue; }
      if (!p.name) continue; // skip if no name
      let base = slugify(p.name);
      if(!base) base = String(p.id || p._id || 'item');
      let candidate = base; let i = 2;
      while(slugSet.has(candidate)) { candidate = `${base}-${i++}`; if(i>50) break; }
      (p as any).slug = candidate; slugSet.add(candidate);
    }
    const outDir = path.join(process.cwd(), 'client', 'public');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const json = JSON.stringify(products, null, 2);
    const hash = crypto.createHash('sha1').update(json).digest('hex').slice(0,16);
    const fileName = `products.${hash}.json`;
    const outFile = path.join(outDir, fileName);
    fs.writeFileSync(outFile, json);
    // Write/Update manifest
    const manifestFile = path.join(outDir, 'products-manifest.json');
    let manifest: any = {};
    if (fs.existsSync(manifestFile)) {
      try { manifest = JSON.parse(fs.readFileSync(manifestFile,'utf-8')); } catch {}
    }
    manifest.current = fileName;
    manifest.generatedAt = new Date().toISOString();
    manifest.count = products.length;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    // Optionally prune old hashed files (keep last 3)
    const prefix = 'products.';
    const all = fs.readdirSync(outDir).filter(f => f.startsWith(prefix) && f.endsWith('.json') && f !== 'products.json');
    if (all.length > 5) {
      const sorted = all.sort((a,b)=> fs.statSync(path.join(outDir,b)).mtimeMs - fs.statSync(path.join(outDir,a)).mtimeMs);
      for (const f of sorted.slice(3)) {
        try { fs.unlinkSync(path.join(outDir,f)); } catch {}
      }
    }
    // Maintain legacy products.json symlink/copy for backward compatibility
    const legacyFile = path.join(outDir, 'products.json');
    try { fs.writeFileSync(legacyFile, json); } catch {}
    console.log('Generated', outFile, 'hash=', hash, 'count=', products.length);
  } catch (e) {
    console.error('Generate products.json failed', e);
    process.exit(1);
  } finally {
    await client.close();
  }
}
main();