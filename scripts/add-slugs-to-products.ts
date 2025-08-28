// Use dynamic import for ESM compatibility
let db: any;

async function getDb() {
  if (!db) {
  db = (await import(new URL("../server/db.ts", import.meta.url).href)).default;
  }
  return db;
}
import { Product } from "@shared/schema";

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .replace(/-+/g, "-");
}


async function addSlugs() {
  const dbInstance = await getDb();
  const products = await dbInstance.collection("products").find({}).toArray();
  for (const product of products) {
    if (!product.slug) {
      const slug = slugify(product.name);
      await dbInstance.collection("products").updateOne(
        { _id: product._id },
        { $set: { slug } }
      );
      console.log(`Added slug '${slug}' to product '${product.name}'`);
    }
  }
  console.log("Done adding slugs.");
  process.exit(0);
}

addSlugs().catch((err) => {
  console.error(err);
  process.exit(1);
});
