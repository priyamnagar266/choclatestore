## Cokha Chocolate Store

Frontend: Netlify (static Vite build)
Backend: Render (Express + MongoDB)

### Architecture
| Concern | Implementation |
|---------|----------------|
| Product catalog (public) | `client/public/products.json` generated at build for instant load & SEO |
| Product CRUD (admin) | Render API endpoints `/api/admin/products` (updates Mongo + triggers Netlify build hook) |
| Orders & Payments | Render API (`/api/create-order`, `/api/orders`, etc.) |
| Auth & Users | Render API JWT endpoints |
| Static site rebuild | Netlify Build Hook called by backend after product mutations |

### Static Product Flow
1. Admin creates/updates/deletes product via backend.
2. Backend writes to MongoDB then POSTs `NETLIFY_BUILD_HOOK_URL`.
3. Netlify build runs: `npm run generate:products && npm run build:client`.
4. Script `scripts/generate-products-json.ts` dumps Mongo `products` collection to `client/public/products.json`.
5. Frontend fetches `/products.json` (fallback to `/api/products` only if static missing).

### Environment Variables (Backend / Render)
```
MONGODB_URI=<your mongodb connection>
MONGODB_DBNAME=<optional db name>
JWT_SECRET=<secret>
RAZORPAY_KEY_ID=<optional>
RAZORPAY_KEY_SECRET=<optional>
NETLIFY_BUILD_HOOK_URL=<netlify hook>
```

### Netlify Build Hook Setup
Create a build hook in Netlify UI, copy the URL, set it in Render env as `NETLIFY_BUILD_HOOK_URL`.

### Local Development
```
pnpm install (or npm install)
pnpm run dev # starts backend (5000) and Vite dev server proxies /api
pnpm run generate:products # regenerate products.json manually
```

### Product Seeding
Insert initial products into MongoDB (matching fields) BEFORE first Netlify build so static file has data.

### Cleanup
All Vercel-related artifacts removed. `api/` directory eliminated.

### Future Enhancements
- Add ETag / hash to `products.json` filename for long-term caching + manifest.
- Add webhook signature verification for build hook.
- Add incremental JSON diff generation for preview.
