import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

/*
  Strategy:
  - Find products whose name or benefits hint at combos (e.g., contains 'combo', 'pack', 'assorted', 'mix').
  - Update their category field to 'Combo' if not already set.
  - Optionally allow manual list via COMBO_IDS env (comma separated product ids or slugs).
*/

const KEYWORDS = ['combo','pack','assorted','mix','bundle'];

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

    const manualListRaw = process.env.COMBO_IDS || '';
    const manualIds = manualListRaw.split(',').map(s=>s.trim()).filter(Boolean);

    const candidates = await col.find({}).toArray();
    let updated = 0; let skipped = 0;
    for(const p of candidates){
      const name = (p.name||'').toLowerCase();
      const benefits: string[] = Array.isArray(p.benefits)? p.benefits.map((b:string)=> b.toLowerCase()) : [];
      const slug = (p.slug||'').toLowerCase();
      const idStr = String(p.id ?? p._id ?? '');
      const isManual = manualIds.includes(idStr) || manualIds.includes(slug);
      const keywordHit = KEYWORDS.some(k=> name.includes(k) || slug.includes(k) || benefits.some(b=> b.includes(k)));
      if((isManual || keywordHit) && p.category !== 'Combo'){
        await col.updateOne({ _id: p._id }, { $set: { category: 'Combo' }});
        updated++;
      } else {
        skipped++;
      }
    }
    console.log(`Combo tagging complete. Updated=${updated} Skipped=${skipped}`);
  } catch(e){
    console.error('Failed to tag combos', e);
    process.exit(1);
  } finally {
    await client.close();
  }
}
run();
