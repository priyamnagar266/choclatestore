import { storage } from '../server/storage.mongodb';
import '../server/db';

// Keep only these IDs (provided by user)
const KEEP = new Set([1,2,3,4,5,6,7,9,10,12,13,16,21]);

async function main(){
  const all = await storage.getProducts();
  const toDelete = all.filter(p => !KEEP.has((p as any).id)).map(p => (p as any).id);
  if(!toDelete.length){
    console.log('No products to delete.');
    return;
  }
  console.log('Deleting product IDs:', toDelete.join(', '));
  const removed = await storage.deleteProducts(toDelete);
  console.log(`Removed ${removed} products.`);
}

main().catch(e=>{ console.error(e); process.exit(1); }).then(()=> process.exit(0));
