## Deployment Guide: Netlify (Client) + Render (Server)

### 1. Overview
You will deploy:
- React/Vite client to Netlify
- Express/Node API to Render (Web Service)

The client now supports an environment variable `VITE_API_BASE` pointing to the Render backend base URL (e.g. `https://your-api.onrender.com`). When unset (local dev) it falls back to relative `/api` which is proxied by Vite.

### 2. Prerequisites
Create accounts on Netlify and Render. Prepare environment variables from your current `.env` (do NOT commit secrets):
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- JWT_SECRET
- Any DB connection strings (Mongo / Postgres etc.)

### 3. Server (Render)
1. Push code to GitHub (ensure latest changes included).
2. In Render dashboard: New > Web Service.
3. Connect repository and select root path (contains `package.json`).
4. Build Command:
   ```
   npm install --production=false && npm run build:server
   ```
   Start Command:
   ```
   npm run start:server
   ```
5. Set Environment Variables (same names as in `.env`). Ensure `NODE_ENV=production`.
6. Add a disk (optional) if you rely on `uploads/` persistence (Render ephemeral disk resets on deploy). For persistent file uploads use an external storage (S3, etc.)—future improvement.
7. Deploy. Note the service URL (e.g. `https://cokha-api.onrender.com`).

### 4. Client (Netlify)
1. In Netlify: New Site from Git.
2. Select repo and branch (`main`).
3. Base directory: `client`
4. Build command: `npm run build:client`
5. Publish directory: `dist/public`
6. Add Environment Variables:
   - `VITE_API_BASE` = Render service base URL (no trailing slash)
   - `VITE_RAZORPAY_KEY_ID` (optional if you want to expose key directly for script usage)
7. Deploy site. After deploy, visiting app should call `https://your-api.onrender.com/api/...`.

### 5. Local Development
```
npm install
npm run dev
```
Runs combined server + Vite (dev mode). Client requests `/api/*` proxied to backend via `vite.config.ts`.

### 6. Testing After Deploy
1. Open Netlify site, register user, ensure API calls succeed (check Render logs).
2. Place order flow (products -> create order -> Razorpay).
3. Admin login via `/admin` or relevant route; verify metrics.

### 7. Optional Improvements / Next Steps
- Migrate file uploads (`uploads/`) to S3 or similar cloud storage (Render disk is ephemeral).
- Add health endpoint `/api/health` for uptime monitoring.
- Add CI pipeline (GitHub Actions) to run `npm run build` & tests (if added) before deploy.

### 8. Rollback Strategy
- Netlify keeps previous deploys (instant rollback via UI).
- Render: keep previous deploy; use Deploys tab -> rollback.

### 9. Environment Variable Summary (Render)
| Variable | Purpose |
|----------|---------|
| PORT | (Render sets) leave blank; server uses provided |
| JWT_SECRET | JWT signing |
| RAZORPAY_KEY_ID | Razorpay key id (public) |
| RAZORPAY_KEY_SECRET | Razorpay secret (private) |
| MONGODB_URI / PG connection | Database connections |

Netlify only needs `VITE_API_BASE` + any public values.

### 10. Troubleshooting
- 404 API from client: ensure `VITE_API_BASE` set correctly (no extra slash) & CORS on server (already enabled).
- Mixed content errors: ensure both client + server on HTTPS (Render & Netlify handle automatically).
- Razorpay script errors: confirm key served in `/api/create-order` response (server uses env var).

---
This project now supports decoupled deployment without changing code references thanks to the `getApiBase()` helper.
