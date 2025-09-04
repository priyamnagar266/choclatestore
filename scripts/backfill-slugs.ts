import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

function slugify(raw: string){
  return raw.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
}

async function run(){
  const uri = process.env.MONGODB_URI;
  if(!uri){
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DBNAME || new URL(uri).pathname.replace('/','') || undefined;
    const db = dbName ? client.db(dbName) : client.db();
    const col = db.collection('products');
    const products = await col.find({}).toArray();
    const seen = new Set<string>();
    let added = 0; let normalized = 0;
    for(const p of products){
      let current = (p as any).slug as string | undefined;
      const desiredBase = slugify(p.name || '');
      if(!current || !current.trim()){
        current = desiredBase || String(p.id || p._id);
      } else {
        const norm = slugify(current);
        if (norm !== current) { current = norm; normalized++; }
      }
      let candidate = current; let i=2;
      while(seen.has(candidate)) { candidate = `${current}-${i++}`; }
      if(!(p as any).slug || (p as any).slug !== candidate){
        await col.updateOne({ _id: p._id }, { $set: { slug: candidate } });
        added++;
      }
      seen.add(candidate);
    }
    console.log(`Slug backfill complete: updated=${added} normalized=${normalized}`);
  } catch(e){
    console.error('Backfill failed', e);
    process.exit(1);
  } finally { await client.close(); }
}
run();
