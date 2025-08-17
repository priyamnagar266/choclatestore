/// <reference types="node" />
/*
 * One-off migration script to copy data from local MongoDB to Atlas.
 * Usage:
 *  1. Set env vars:
 *     LOCAL_MONGO_URI=mongodb://127.0.0.1:27017 LOCAL_DB=cokhaenergyfoods \
 *     ATLAS_MONGO_URI='mongodb+srv://<user>:<pass>@cluster.mongodb.net' ATLAS_DB=cokhaenergyfoods \
 *     npm run migrate:atlas
 *  2. The script copies collections: products, users, orders, contacts, newsletters, settings
 *  3. Skips if destination already has documents (to avoid duplicates)
 */
import { MongoClient } from 'mongodb';

async function run() {
  const localUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017';
  const localDbName = process.env.LOCAL_DB || 'cokhaenergyfoods';
  const atlasUri = process.env.ATLAS_MONGO_URI; // required
  const atlasDbName = process.env.ATLAS_DB || localDbName;

  if (!atlasUri) {
    console.error('Missing ATLAS_MONGO_URI env var');
    process.exit(1);
  }

  const collections = ['products','users','orders','contacts','newsletters','settings'];

  const localClient = new MongoClient(localUri);
  const atlasClient = new MongoClient(atlasUri);

  try {
    await localClient.connect();
    await atlasClient.connect();
    console.log('Connected to both local and Atlas clusters');

    const localDb = localClient.db(localDbName);
    const atlasDb = atlasClient.db(atlasDbName);

    for (const coll of collections) {
      const source = localDb.collection(coll);
      const dest = atlasDb.collection(coll);
      const destCount = await dest.estimatedDocumentCount();
      if (destCount > 0) {
        console.log(`[SKIP] ${coll}: destination already has ${destCount} docs`);
        continue;
      }
      const docs = await source.find({}).toArray();
      if (!docs.length) {
        console.log(`[EMPTY] ${coll}: no documents locally`);
        continue;
      }
      // Insert preserving _id
      await dest.insertMany(docs, { ordered: false });
      console.log(`[OK] ${coll}: migrated ${docs.length} docs`);
    }
    console.log('Migration complete');
  } catch (e) {
    console.error('Migration failed', e);
    process.exitCode = 1;
  } finally {
    await localClient.close();
    await atlasClient.close();
  }
}

run();
