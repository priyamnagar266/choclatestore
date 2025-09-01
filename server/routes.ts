import dotenv from "dotenv";
dotenv.config();

import type { Express } from "express";
import { createServer, type Server } from "http";
import Razorpay from "razorpay";
import { storage } from "./storage.mongodb";
import { ObjectId } from 'mongodb';
import { db } from './db';
import { insertOrderSchema, insertContactSchema, insertNewsletterSchema, insertUserSchema, TestimonialModel, insertTestimonialSchema, updateTestimonialSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { generateJWT, authenticateJWT } from "./jwt";
import crypto from "crypto";
import cors from "cors";
// Multer imported without types (lightweight) - fallback to any for file type
// @ts-ignore
import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';
import { z } from 'zod';

// Extend Request type locally to include file from multer
interface MulterRequest extends Request {
  // declare minimal shape for uploaded file
  file?: { filename: string; originalname?: string; mimetype?: string; path?: string };
}

// Razorpay init made resilient: don't crash server if keys missing in production
let razorpay: Razorpay | null = null;
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[Razorpay] Credentials missing (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). /api/create-order will return 500 until configured.');
} else {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('[Razorpay] Initialized. Key prefix:', (process.env.RAZORPAY_KEY_ID || '').slice(0,4));
  } catch (e) {
    console.error('[Razorpay] Initialization failed:', e);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get product by slug
  app.get("/api/products/slug/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const product = await storage.getProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching product: " + error.message });
    }
  });
  // Helper: trigger Netlify build hook with retry/backoff (fire-and-forget)
  async function triggerNetlifyBuild(reason: string) {
    const hook = process.env.NETLIFY_BUILD_HOOK_URL;
    if (!hook) return;
    const maxAttempts = 3;
    let delay = 500; // ms
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, attempt, ts: Date.now() })
        });
        if (!res.ok) throw new Error('Status ' + res.status);
        console.log(`[BuildHook] success reason=${reason} attempt=${attempt}`);
        return;
      } catch (e) {
        console.error(`[BuildHook] attempt ${attempt} failed`, e);
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }
    }
    console.error('[BuildHook] all attempts failed for reason=' + reason);
  }

  // Zod schemas for product create/update validation (server-side enforcement)
  const productCreateSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    price: z.coerce.number().nonnegative(),
    image: z.string().optional().default(''),
    benefits: z.preprocess(val => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    }, z.array(z.string()).default([])),
    category: z.string().min(1),
    inStock: z.coerce.number().int().nonnegative().default(0),
    energyKcal: z.coerce.number().nonnegative().optional(),
    proteinG: z.coerce.number().nonnegative().optional(),
    carbohydratesG: z.coerce.number().nonnegative().optional(),
    totalSugarG: z.coerce.number().nonnegative().optional(),
    addedSugarG: z.coerce.number().nonnegative().optional(),
    totalFatG: z.coerce.number().nonnegative().optional(),
    saturatedFatG: z.coerce.number().nonnegative().optional(),
    transFatG: z.coerce.number().nonnegative().optional(),
  });
  const productUpdateSchema = productCreateSchema.partial().refine(obj => Object.keys(obj).length > 0, { message: 'No fields supplied for update' });

  // Simple health check for uptime monitors / Render health probes
  app.get('/api/health', async (_req, res) => {
    let dbStatus: any = { connected: false };
    try {
      // Attempt a ping; if fails we'll report error
      await db.command({ ping: 1 });
      const productCount = await db.collection('products').countDocuments();
      dbStatus = { connected: true, productCount };
    } catch (e: any) {
      dbStatus = { connected: false, error: e?.message || String(e) };
    }
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now(), db: dbStatus });
  });
  // Root route (when frontend is hosted separately). Prevents 'Cannot GET /'
  app.get('/', (_req, res) => {
    res.send('Cokha API running. Frontend is deployed separately. Health: /api/health');
  });
  // Debug endpoint to list all orders in the DB
  // Debug endpoint to list all orders for a test user (replace with actual userId if needed)
  app.get("/api/debug/orders", async (req, res) => {
    try {
      // Try to fetch all orders for userId = "1" (or change as needed)
      const testUserId = "1";
      const allOrders = await storage.getOrdersByUserId?.(testUserId) || [];
      res.json({ orders: allOrders });
    } catch (error) {
      console.error("[DEBUG /api/debug/orders] Error fetching orders:", error);
      res.status(500).json({ message: "Error fetching orders: " + (error instanceof Error ? error.message : JSON.stringify(error)) });
    }
  });
  // Enable CORS middleware
  app.use(cors());

  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      // Simple in-memory cache (invalidated on mutations)
      const globalAny: any = global as any;
      if (!globalAny.__productCache) {
        globalAny.__productCache = { data: null as any, ts: 0, etag: '', manifestHash: '' };
      }
      const cache = globalAny.__productCache;
      const now = Date.now();
      const maxAgeMs = 60_000; // 1 minute freshness (adjust as needed)
      let fromCache = cache.data && (now - cache.ts < maxAgeMs);
      if (!fromCache) {
        const fresh = await storage.getProducts();
        // Build a stable hash using updatedAt + ids + length
        const hashBase = fresh.map((p: any) => `${p.id}:${p.updatedAt || ''}:${p.price}`).join('|');
        const etagRaw = crypto.createHash('sha1').update(hashBase).digest('base64').slice(0, 16);
        const etag = 'W/"' + etagRaw + '"';
        cache.data = fresh; cache.ts = now; cache.etag = etag; cache.manifestHash = etagRaw;
      }
      if (req.headers['if-none-match'] && cache.etag && req.headers['if-none-match'] === cache.etag) {
        return res.status(304).end();
      }
      if (cache.etag) res.setHeader('ETag', cache.etag);
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      if (cache.manifestHash) res.setHeader('X-Products-Hash', cache.manifestHash);
      res.json(cache.data);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching products: " + error.message });
    }
  });

  // Get single product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching product: " + error.message });
    }
  });

  // Public: list active testimonials
  app.get('/api/testimonials', async (_req, res) => {
    try {
      const list = await TestimonialModel.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
      res.json(list);
    } catch (e:any) { res.status(500).json({ message: e.message }); }
  });

  // Admin auth helper (reuse JWT middleware + role check)
  function requireAdmin(req: any, res: any, next: any){
    authenticateJWT(req,res,()=>{
      if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message:'Admin only'});
      next();
    });
  }

  // Admin: create testimonial
  app.post('/api/admin/testimonials', requireAdmin, async (req,res)=>{
    try {
      const data = insertTestimonialSchema.parse(req.body);
      const t = await TestimonialModel.create(data);
      triggerNetlifyBuild('testimonial-create');
      res.json(t);
    } catch(e:any){ res.status(400).json({ message:e.message }); }
  });

  // Admin: update testimonial
  app.patch('/api/admin/testimonials/:id', requireAdmin, async (req,res)=>{
    try {
      const data = updateTestimonialSchema.parse(req.body);
      const t = await TestimonialModel.findByIdAndUpdate(req.params.id, data, { new:true });
      if(!t) return res.status(404).json({ message:'Not found'});
      triggerNetlifyBuild('testimonial-update');
      res.json(t);
    } catch(e:any){ res.status(400).json({ message:e.message }); }
  });

  // Admin: delete testimonial
  app.delete('/api/admin/testimonials/:id', requireAdmin, async (req,res)=>{
    try {
      const t = await TestimonialModel.findByIdAndDelete(req.params.id);
      if(!t) return res.status(404).json({ message:'Not found'});
      triggerNetlifyBuild('testimonial-delete');
      res.json({ success:true });
    } catch(e:any){ res.status(400).json({ message:e.message }); }
  });

  // Admin: list all testimonials (including inactive)
  app.get('/api/admin/testimonials', requireAdmin, async (_req,res)=>{
    try { const list = await TestimonialModel.find().sort({ order:1, createdAt:-1 }); res.json(list); }
    catch(e:any){ res.status(500).json({ message:e.message }); }
  });
  // (Removed legacy duplicate minimal admin product routes; unified later with full-featured routes.)

  // Create Razorpay order
  app.post("/api/create-order", async (req, res) => {
    try {
        if (!razorpay) {
          return res.status(500).json({ message: "Payment gateway not configured. Please try again later.", code: 'RAZORPAY_NOT_CONFIGURED' });
        }
        const { amount, currency = "INR" } = req.body;

        if (!amount || amount <= 0) {
            console.error("[Razorpay] Invalid amount:", amount);
            return res.status(400).json({ message: "Invalid amount" });
        }

        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: currency,
            receipt: `receipt_${Date.now()}`,
        };

        try {
            const order = await razorpay.orders.create(options);

            // Debug log for created Razorpay order
            console.log("[DEBUG /api/create-order] Created Razorpay order:", order);

            // Fix for Razorpay order creation response
            res.json({ 
                orderId: order.id, // Ensure Razorpay order.id is stored as a string
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID
            });
        } catch (razorpayError: any) {
            console.error("[Razorpay] API error:", razorpayError);
            res.status(500).json({ message: "Error creating Razorpay order: " + razorpayError.message });
        }
    } catch (error: any) {
        console.error("[Razorpay] Server error:", error);
        res.status(500).json({ message: "Error creating Razorpay order: " + error.message });
    }
  });

  // Create order (linked to user)
  app.post("/api/orders", authenticateJWT, async (req, res) => {
    try {
      // Extract user ID from JWT
      // @ts-ignore
      const userId = req.user.id;

      // Validate and parse order data
  const incoming = { ...req.body };
  if (!incoming.userId || incoming.userId === '') incoming.userId = userId;
  const orderData = insertOrderSchema.parse(incoming);

      // Create order in storage
      const order = await storage.createOrder(orderData);

      // Debug log for created order
      console.log("[DEBUG /api/orders] Created order:", order);

      // Check if order creation was successful
      if (!order || !order.id) {
        throw new Error("Failed to create order. Please try again.");
      }

      // Debug log for order ID
      console.log("[DEBUG /api/orders] Order ID:", order.id);

      // Return created order
      res.json(order);
    } catch (error: any) {
      console.error("[Create Order] ERROR:", error.message);
      res.status(400).json({ message: "Error creating order: " + error.message });
    }
  });

  // Improved error handling and validation for payment verification
  app.post("/api/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

        // Debug logs for payment verification
        console.log("[DEBUG /api/verify-payment] Verifying payment for Order ID:", razorpay_order_id);
        console.log("[DEBUG /api/verify-payment] Payment ID:", razorpay_payment_id);
        console.log("[DEBUG /api/verify-payment] Signature:", razorpay_signature);

        // Validate input
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            console.error("[ERROR /api/verify-payment] Missing payment verification details.");
            return res.status(400).json({ message: "Missing payment verification details." });
        }

        // Verify payment with Razorpay
        const secret = process.env.RAZORPAY_KEY_SECRET || '';
        const expectedSignature = crypto.createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

  if (expectedSignature === razorpay_signature) {
            // Debug log for successful verification
            console.log("[DEBUG /api/verify-payment] Payment verified successfully for Order ID:", razorpay_order_id);

            // Log received orderData
            console.log("[DEBUG /api/verify-payment] Received orderData:", orderData);

            // Create order in DB if orderData is provided
            let createdOrder = null;
      if (orderData) {
                try {
          // Enrich missing userId by customerEmail lookup (helps legacy/unauth flows)
          if ((!orderData.userId || orderData.userId === '') && orderData.customerEmail) {
            try {
              const userMatch = await storage.getUserByEmail(orderData.customerEmail);
              if (userMatch) {
                // @ts-ignore
                orderData.userId = (userMatch._id?.toString?.()) || userMatch.id || orderData.userId;
              }
            } catch (lookupErr) {
              console.warn('[verify-payment] user lookup failed', lookupErr);
            }
          }
          // Final attempt: pull userId from Authorization header JWT if provided
          if (!orderData.userId) {
            try {
              const authHeader = req.headers['authorization'];
              if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const jwtModule = await import('./jwt');
                const decoded: any = await new Promise((resolve, reject) => {
                  // use same secret via verify inside authenticateJWT indirectly
                  const jwtLib = require('jsonwebtoken');
                  const secret = process.env.JWT_SECRET || 'supersecretkey';
                  jwtLib.verify(token, secret, (err: any, user: any) => err ? reject(err) : resolve(user));
                });
                if (decoded?.id) orderData.userId = decoded.id;
              }
            } catch (jwtErr) {
              console.warn('[verify-payment] JWT decode fallback failed', jwtErr);
            }
          }
          // Validate and parse order data after enrichment
          const parsedOrderData = insertOrderSchema.parse(orderData);
                    console.log("[DEBUG /api/verify-payment] Parsed orderData:", parsedOrderData);
                    createdOrder = await storage.createOrder(parsedOrderData);
                    console.log("[DEBUG /api/verify-payment] Created order:", createdOrder);
                } catch (orderError) {
                    console.error("[ERROR /api/verify-payment] Error creating order:", orderError);
                    // Enhanced error logging for order creation
                    if (orderError instanceof Error) {
                        console.error("[ORDER CREATION ERROR STACK]", orderError.stack);
                    }
                    return res.status(400).json({ success: false, message: "Payment verified but failed to create order: " + (orderError instanceof Error ? orderError.message : JSON.stringify(orderError)), orderData });
                }
            }

            // Respond with both payment and order info
            res.json({
                success: true,
                message: "Payment verified successfully",
                razorpayOrderId: razorpay_order_id,
                orderId: createdOrder?._id || createdOrder?.id || null,
                orderCreationDebug: createdOrder,
                receivedOrderData: orderData
            });
        } else {
            console.error("[ERROR /api/verify-payment] Invalid payment signature", { expectedSignature, razorpay_signature });
            res.status(400).json({ success: false, message: "Invalid payment signature" });
        }
    } catch (error: any) {
        console.error("[ERROR /api/verify-payment] Error verifying payment:", error);
        if (error instanceof Error) {
            console.error("[PAYMENT VERIFICATION ERROR STACK]", error.stack);
        }
        res.status(500).json({ success: false, message: "Error verifying payment: " + (error instanceof Error ? error.message : JSON.stringify(error)) });
    }
  });

  // Update order with payment info
  app.patch("/api/orders/:id/payment", async (req, res) => {
    try {
        const orderId = req.params.id; // Use string directly without parseInt
        const { razorpayPaymentId, status } = req.body;

        // Validate input
        if (!razorpayPaymentId || !status) {
            console.error("[ERROR /api/orders/:id/payment] Missing payment details.");
            return res.status(400).json({ message: "Missing payment details." });
        }

        // Debug log for payment update
        console.log("[DEBUG /api/orders/:id/payment] Updating payment for Order ID:", orderId);
        console.log("[DEBUG /api/orders/:id/payment] Payment ID:", razorpayPaymentId);
        console.log("[DEBUG /api/orders/:id/payment] Status:", status);

        // Pass string orderId directly to storage
        const updatedOrder = await storage.updateOrderPayment(orderId, razorpayPaymentId, status);

        // Check if order update was successful
        if (!updatedOrder) {
            console.error("[ERROR /api/orders/:id/payment] Failed to update payment for Order ID:", orderId);
            return res.status(404).json({ message: "Order not found or failed to update payment details." });
        }

        // Debug log for updated order
        console.log("[DEBUG /api/orders/:id/payment] Payment updated successfully for Order ID:", orderId);

        // Return updated order
        res.json({ success: true, message: "Payment updated successfully." });
    } catch (error: unknown) {
        console.error("[ERROR /api/orders/:id/payment] Error updating order payment:", error instanceof Error ? error.message : error);
        res.status(500).json({ message: "Error updating order payment: " + (error instanceof Error ? error.message : error) });
    }
  });

  // Create contact
  app.post("/api/contacts", async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.json({ message: "Contact form submitted successfully", id: contact.id });
    } catch (error: any) {
      res.status(400).json({ message: "Error submitting contact form: " + error.message });
    }
  });

  // Newsletter subscription
  app.post("/api/newsletter", async (req, res) => {
    try {
      const newsletterData = insertNewsletterSchema.parse(req.body);
      const newsletter = await storage.subscribeNewsletter(newsletterData);
      res.json({ message: "Successfully subscribed to newsletter", id: newsletter.id });
    } catch (error: any) {
      res.status(400).json({ message: "Error subscribing to newsletter: " + error.message });
    }
  });

  // AUTH: Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      // If there are no admins yet, promote this first user to admin automatically
      let roleToUse = userData.role || 'user';
      try {
        const adminCount = await storage.countAdmins?.();
        if (adminCount === 0) roleToUse = 'admin';
      } catch {}
      const newUser = await storage.createUser({ ...userData, role: roleToUse, password: hashedPassword });
  const userId = (newUser as any)._id?.toString?.() || (newUser as any).id;
  const token = generateJWT({ id: userId, email: newUser.email, role: newUser.role });
  res.json({ id: userId, email: newUser.email, name: newUser.name, role: newUser.role, token });
    } catch (error: any) {
      res.status(400).json({ message: "Error registering user: " + error.message });
    }
  });

  // AUTH: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
  const userId = (user as any)._id?.toString?.() || (user as any).id;
  const token = generateJWT({ id: userId, email: user.email, role: user.role });
  res.json({ id: userId, email: user.email, name: user.name, role: user.role, token });
    } catch (error: any) {
      res.status(400).json({ message: "Error logging in: " + error.message });
    }
  });

  // ADMIN: Login
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      if (user.role !== 'admin') return res.status(403).json({ message: 'Not an admin user' });
      const valid = await bcrypt.compare(password, (user as any).password);
      if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
      const userId = (user as any)._id?.toString?.() || (user as any).id;
      const token = generateJWT({ id: userId, email: user.email, role: user.role });
      res.json({ id: userId, email: user.email, name: user.name, role: user.role, token });
    } catch (e: any) {
      res.status(400).json({ message: 'Admin login failed: ' + e.message });
    }
  });

  // ADMIN: Overview stats
  app.get('/api/admin/overview', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const stats = await storage.getOverviewStats?.();
      res.json(stats || {});
    } catch (e: any) {
      console.error('[ADMIN /api/admin/overview] error', e);
      res.status(500).json({ message: 'Failed to load overview' });
    }
  });

  // ADMIN: Metrics (dashboard KPIs + recent orders)
  app.get('/api/admin/metrics', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const stats = await storage.getOrderStats();
      const recent = await storage.getRecentOrders(10);
      const recentOrders = recent.map((o: any) => ({
        id: o._id?.toString?.() || o.id,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        total: o.total,
  status: o.status || 'placed',
        createdAt: o.createdAt,
        itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      }));
      res.json({ ...stats, recentOrders });
    } catch (e: any) {
      console.error('[ADMIN GET /api/admin/metrics] error', e);
      res.status(500).json({ message: 'Failed to load metrics' });
    }
  });

  // File upload setup for product images (stores filenames under /uploads)
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storageEngine: StorageEngine = multer.diskStorage({
    // use any for file param to avoid missing types
    destination: (_req: Request, _file: any, cb: (error: Error | null, destination: string) => void) => cb(null, uploadDir),
    filename: (_req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
      const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
      cb(null, unique + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage: storageEngine });

  // Serve uploaded images statically
  // NOTE: in production, consider a CDN or object storage
  app.use('/uploads', (await import('express')).default.static(uploadDir));

  // ADMIN: Products list with pagination & search
  app.get('/api/admin/products', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { page = '1', pageSize = '20', search } = req.query as Record<string,string>;
      const pg = Math.max(1, parseInt(page));
      const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
      const data = await storage.listProductsPaginated(pg, ps, search);
      res.json(data);
    } catch (e: any) {
      console.error('[ADMIN GET /api/admin/products] error', e);
      res.status(500).json({ message: 'Failed to load products' });
    }
  });

  // ADMIN: Diagnose products missing critical fields
  app.get('/api/admin/products-incomplete', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const raw = await (await import('./db')).db.collection('products').find({ $or: [ { name: { $exists: false } }, { description: { $exists: false } }, { price: { $exists: false } }, { category: { $exists: false } } ] }).toArray();
      res.json({ count: raw.length, products: raw });
    } catch (e: any) {
      res.status(500).json({ message: 'Failed to scan products', error: e.message });
    }
  });

  // ADMIN: Repair a product by setting provided fields if they were missing
  app.patch('/api/admin/products/:id/repair', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const id = parseInt(req.params.id, 10);
      const allowed = ['name','description','price','category','image','benefits','inStock'];
      const update: any = {};
      for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
      if (Object.keys(update).length === 0) return res.status(400).json({ message: 'No repair fields provided' });
      update.updatedAt = new Date();
      await (await import('./db')).db.collection('products').updateOne({ id } as any, { $set: update });
      const fresh = await storage.getProduct(id);
      // Invalidate cache & trigger rebuild
      const globalAny: any = global as any; if (globalAny.__productCache) globalAny.__productCache.ts = 0;
      triggerNetlifyBuild('product-repair');
      res.json({ repaired: true, product: fresh });
    } catch (e: any) {
      res.status(500).json({ message: 'Repair failed', error: e.message });
    }
  });

  // ADMIN: Create product (supports multipart for image upload)
  app.post('/api/admin/products', authenticateJWT, upload.single('imageFile'), async (req: MulterRequest, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const body = req.body || {};
      // If JSON sent (application/json) we won't have file. If multipart, file path is stored.
  const base = { ...body };
  console.log('[ADMIN CREATE] raw multipart fields', base);
      if (req.file) base.image = '/uploads/' + req.file.filename;
      try {
        const parsed = productCreateSchema.parse(base);
        const payload: any = { ...parsed, createdAt: new Date(), updatedAt: new Date() };
        const product = await storage.createProduct(payload);
  // Invalidate cache
  const globalAny: any = global as any; if (globalAny.__productCache) globalAny.__productCache.ts = 0;
        // Trigger Netlify rebuild (static products.json refresh) with retry
        triggerNetlifyBuild('product-create');
        res.status(201).json(product);
      } catch (ve: any) {
        return res.status(400).json({ message: 'Invalid product payload', issues: ve?.errors || ve?.issues || ve?.message });
      }
    } catch (e: any) {
      console.error('[ADMIN POST /api/admin/products] error', e);
      res.status(500).json({ message: 'Failed to create product' });
    }
  });

  // ADMIN: Update product
  app.put('/api/admin/products/:id', authenticateJWT, upload.single('imageFile'), async (req: MulterRequest, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const id = parseInt(req.params.id,10);
      const body = req.body || {};
      const updateRaw: any = { ...body };
      if (req.file) updateRaw.image = '/uploads/' + req.file.filename;
      try {
        const parsedUpdate = productUpdateSchema.parse(updateRaw);
        const update: any = { ...parsedUpdate, updatedAt: new Date() };
        const ok = await storage.updateProduct(id, update);
        if (!ok) return res.status(404).json({ message: 'Product not found' });
        // Fresh DB read to ensure we return canonical doc
        const fresh = await storage.getProduct(id);
        const globalAny: any = global as any; if (globalAny.__productCache) globalAny.__productCache.ts = 0;
        triggerNetlifyBuild('product-update');
        res.json(fresh);
      } catch (ve: any) {
        return res.status(400).json({ message: 'Invalid update payload', issues: ve?.errors || ve?.issues || ve?.message });
      }
    } catch (e: any) {
      console.error('[ADMIN PUT /api/admin/products/:id] error', e);
      res.status(500).json({ message: 'Failed to update product' });
    }
  });

  // ADMIN: Delete product
  app.delete('/api/admin/products/:id', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const id = parseInt(req.params.id,10);
  const ok = await storage.deleteProduct(id);
      if (!ok) return res.status(404).json({ message: 'Product not found' });
  const globalAny: any = global as any; if (globalAny.__productCache) globalAny.__productCache.ts = 0;
      triggerNetlifyBuild('product-delete');
      res.json({ success: true });
    } catch (e: any) {
      console.error('[ADMIN DELETE /api/admin/products/:id] error', e);
      res.status(500).json({ message: 'Failed to delete product' });
    }
  });

  // Manual rebuild trigger (admin only)
  app.post('/api/admin/trigger-rebuild', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try { triggerNetlifyBuild('manual-trigger'); res.json({ triggered: true }); }
    catch (e) { res.status(500).json({ message: 'Failed to trigger rebuild' }); }
  });

  // ADMIN: Customers list with stats
  app.get('/api/admin/customers', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { page = '1', pageSize = '20', search, startDate, endDate } = req.query as Record<string,string>;
      const pg = Math.max(1, parseInt(page));
      const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
      const data = await storage.listCustomersWithStats(pg, ps, search, startDate, endDate);
      res.json(data);
    } catch (e: any) {
      console.error('[ADMIN GET /api/admin/customers] error', e);
      res.status(500).json({ message: 'Failed to load customers' });
    }
  });

  // ADMIN: Sales reports (monthly, top products, category sales)
  app.get('/api/admin/reports/sales', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { startDate, endDate } = req.query as Record<string,string>;
      const report = await storage.getSalesReport(startDate, endDate);
      res.json(report);
    } catch (e: any) {
      console.error('[ADMIN GET /api/admin/reports/sales] error', e);
      res.status(500).json({ message: 'Failed to load sales report' });
    }
  });

  // ADMIN: Settings (profile + store settings)
  app.get('/api/admin/settings', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      // @ts-ignore
      const adminId = req.user.id;
      const user = await storage.getUserById(adminId);
      const store = await storage.getStoreSettings();
      res.json({ profile: { id: adminId, name: user?.name, email: user?.email }, store });
    } catch (e: any) {
      console.error('[ADMIN GET /api/admin/settings] error', e);
      res.status(500).json({ message: 'Failed to load settings' });
    }
  });

  app.put('/api/admin/settings', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { profile, store } = req.body || {};
      // Update profile (name, email, password)
      // @ts-ignore
      const adminId = req.user.id;
      if (profile) {
        const update: any = {};
        if (profile.name) update.name = profile.name;
        if (profile.email) update.email = profile.email;
        if (profile.password) {
          const hashed = await bcrypt.hash(profile.password, 10);
          update.password = hashed;
        }
        if (Object.keys(update).length) {
          try {
            const objectId = new (await import('mongodb')).ObjectId(adminId);
            await (await import('./db')).db.collection('users').updateOne({ _id: objectId } as any, { $set: update });
          } catch {
            await (await import('./db')).db.collection('users').updateOne({ id: adminId } as any, { $set: update });
          }
        }
      }
      if (store) {
        const normalized: any = {};
        if (store.currency) normalized.currency = String(store.currency);
        if (store.taxRate !== undefined) normalized.taxRate = parseFloat(store.taxRate);
        if (store.shippingCharges !== undefined) normalized.shippingCharges = parseFloat(store.shippingCharges);
        await storage.updateStoreSettings(normalized);
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error('[ADMIN PUT /api/admin/settings] error', e);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // ADMIN: Orders list with filters & pagination
  app.get('/api/admin/orders', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { page = '1', pageSize = '20', status, paymentStatus, startDate, endDate } = req.query as Record<string,string>;
      const pg = Math.max(1, parseInt(page));
      const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
      const data = await storage.listOrders({ status, paymentStatus, startDate, endDate }, pg, ps);
      res.json(data);
    } catch (e: any) {
      console.error('[ADMIN /api/admin/orders] error', e);
      res.status(500).json({ message: 'Failed to load orders' });
    }
  });

  // ADMIN: Update order status
  app.patch('/api/admin/orders/:id/status', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'Status required' });
      const ok = await storage.updateOrderStatus(id, status);
      if (!ok) return res.status(400).json({ message: 'Invalid status or update failed' });
      res.json({ success: true });
    } catch (e: any) {
      console.error('[ADMIN PATCH /api/admin/orders/:id/status] error', e);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // ADMIN: Single order detail (full for label/PDF)
  app.get('/api/admin/orders/:id', authenticateJWT, async (req, res) => {
    // @ts-ignore
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { id } = req.params;
      const ordersCol = (await import('./db')).db.collection('orders');
      let raw: any = null;
      // Try ObjectId lookup first
      try {
        const objectId = new ObjectId(id);
        raw = await ordersCol.findOne({ _id: objectId } as any);
      } catch {}
      // Fallback lookups (string id fields some legacy docs may use)
      if (!raw) raw = await ordersCol.findOne({ id } as any);
      if (!raw) raw = await ordersCol.findOne({ orderId: id } as any);
      if (!raw) return res.status(404).json({ message: 'Order not found' });
      // Best-effort product name/price mapping supporting both ObjectId _id and numeric/string id fields
      let items = Array.isArray((raw as any).items) ? (raw as any).items : [];
      try {
        const productIds = items.map((it:any)=> it.productId).filter(Boolean);
        if (productIds.length) {
          const objectIdCandidates: any[] = [];
          const nonObjectIds: any[] = [];
          for (const pid of productIds) {
            if (typeof pid === 'string' && /^[0-9a-fA-F]{24}$/.test(pid)) {
              try { objectIdCandidates.push(new ObjectId(pid)); continue; } catch {}
            }
            // treat as numeric/string legacy id
            nonObjectIds.push(typeof pid === 'number' ? pid : (isNaN(Number(pid)) ? pid : Number(pid)));
          }
          const productsCol = (await import('./db')).db.collection('products');
          const or: any[] = [];
          if (objectIdCandidates.length) or.push({ _id: { $in: objectIdCandidates } });
          if (nonObjectIds.length) or.push({ id: { $in: nonObjectIds } });
          let prodDocs: any[] = [];
          if (or.length === 1) {
            prodDocs = await productsCol.find(or[0] as any).toArray();
          } else if (or.length > 1) {
            prodDocs = await productsCol.find({ $or: or } as any).toArray();
          }
          const map: Record<string, any> = {};
          for (const p of prodDocs) {
            const _idStr = (p as any)._id?.toString?.();
            if (_idStr) map[_idStr] = p;
            if ((p as any).id !== undefined) map[String((p as any).id)] = p;
          }
          items = items.map((it:any)=>{
            const key = String(it.productId);
            const found = map[key];
            return { ...it, name: found?.name ?? it.name, price: found?.price ?? it.price };
          });
        }
      } catch {}
      const dto = {
        id: (raw as any)._id?.toString?.(),
        customerName: (raw as any).customerName,
        customerEmail: (raw as any).customerEmail,
        customerPhone: (raw as any).customerPhone,
        address: (raw as any).address,
        city: (raw as any).city,
        pincode: (raw as any).pincode,
        status: (raw as any).status || 'placed',
        subtotal: (raw as any).subtotal,
  discount: (raw as any).discount || 0,
        deliveryCharges: (raw as any).deliveryCharges,
        total: (raw as any).total,
        paymentStatus: (raw as any).razorpayPaymentId ? 'paid' : 'unpaid',
        razorpayPaymentId: (raw as any).razorpayPaymentId || null,
        createdAt: (raw as any).createdAt,
  items: items.map((it:any)=> ({ productId: it.productId, quantity: it.quantity, name: it.name, price: it.price }))
      };
      res.json(dto);
    } catch (e:any) {
      console.error('[ADMIN GET /api/admin/orders/:id] error', e);
      res.status(500).json({ message: 'Failed to load order' });
    }
  });

  // Example protected route
  app.get("/api/auth/me", authenticateJWT, async (req, res) => {
    // @ts-ignore
    res.json({ user: req.user });
  });

  // Protected user profile route
  app.get("/api/profile", authenticateJWT, async (req, res) => {
    // @ts-ignore
    res.json({ user: req.user, message: "This is a protected profile route." });
  });

  // Protected route to get user orders
  app.get("/api/orders/me", authenticateJWT, async (req, res) => {
    // @ts-ignore
  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const userEmail = req.user.email;
    try {
      let ordersRaw = await storage.getOrdersByUserId?.(userId) || [];
      // Fallback: some historical orders may have missing/blank userId but matching customerEmail
      // @ts-ignore optional email fallback
      if ((!ordersRaw || ordersRaw.length === 0) && userEmail && storage.getOrdersByCustomerEmail) {
        // @ts-ignore
        const emailOrders = await storage.getOrdersByCustomerEmail(userEmail);
        if (emailOrders?.length) ordersRaw = emailOrders;
      }
      // Strict filtering: only include orders that belong to this userId OR legacy orders with blank userId but matching customerEmail
      ordersRaw = ordersRaw.filter((o: any) => {
        try {
          if (o.userId) {
            if (typeof o.userId === 'string' && o.userId === userId) return true;
            if (o.userId?.toString?.() === userId) return true;
            return false; // userId present but doesn't match
          }
          // Legacy: no userId stored yet, allow if email matches
          if ((!o.userId || o.userId === '') && o.customerEmail && userEmail && o.customerEmail === userEmail) return true;
          return false;
        } catch { return false; }
      });
      // Fetch products once to map names/prices
      let productMap: Record<string, any> = {};
      try {
        const allProducts = await storage.getProducts();
        for (const p of allProducts as any[]) {
          if (p) {
            if (p.id !== undefined) productMap[String(p.id)] = p;
            if (p._id) productMap[String(p._id)] = p;
          }
        }
      } catch (e) {
        console.warn('[GET /api/orders/me] Failed to load products for enrichment', e);
      }
      // Normalize shape: ensure id field exists (string), items array length safe, createdAt serialized
      const orders = ordersRaw.map((o: any) => ({
        id: o._id?.toString?.() || o.id || o.orderId,
        orderId: o._id?.toString?.() || o.id || o.orderId,
  userId: (typeof o.userId === 'string') ? o.userId : (o.userId?.toString?.()),
        total: o.total,
        subtotal: o.subtotal,
        deliveryCharges: o.deliveryCharges,
  status: o.status || 'placed',
        razorpayPaymentId: o.razorpayPaymentId || null,
        items: Array.isArray(o.items) ? o.items.map((it: any) => {
          const prod = productMap[String(it.productId)] || productMap[String(parseInt(it.productId))];
          return {
            productId: it.productId,
            quantity: it.quantity,
            name: prod?.name,
            price: prod?.price,
            image: prod?.image,
          };
        }) : [],
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
      }));
      res.json({ orders });
    } catch (e) {
      console.error('[GET /api/orders/me] error', e);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Fetch orders by specific userId (self or admin)
  app.get('/api/orders/user/:id', authenticateJWT, async (req, res) => {
    // @ts-ignore
    const authUser = req.user;
    const targetId = req.params.id;
    try {
      if (authUser.id !== targetId && authUser.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      let ordersRaw = await storage.getOrdersByUserId?.(targetId) || [];
      // Fetch products for enrichment
      let productMap: Record<string, any> = {};
      try {
        const allProducts = await storage.getProducts();
        for (const p of allProducts as any[]) {
          if (p) {
            if (p.id !== undefined) productMap[String(p.id)] = p;
            if (p._id) productMap[String(p._id)] = p;
          }
        }
      } catch (e) {
        console.warn('[GET /api/orders/user/:id] product enrichment failed', e);
      }
      const orders = ordersRaw.map((o: any) => ({
        id: o._id?.toString?.() || o.id || o.orderId,
        orderId: o._id?.toString?.() || o.id || o.orderId,
        userId: (typeof o.userId === 'string') ? o.userId : (o.userId?.toString?.()),
        total: o.total,
        subtotal: o.subtotal,
        deliveryCharges: o.deliveryCharges,
  status: o.status || 'placed',
        razorpayPaymentId: o.razorpayPaymentId || null,
        items: Array.isArray(o.items) ? o.items.map((it: any) => {
          const prod = productMap[String(it.productId)] || productMap[String(parseInt(it.productId))];
          return {
            productId: it.productId,
            quantity: it.quantity,
            name: prod?.name,
            price: prod?.price,
            image: prod?.image,
          };
        }) : [],
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
      }));
      res.json({ orders });
    } catch (e) {
      console.error('[GET /api/orders/user/:id] error', e);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Admin maintenance: backfill userId for legacy orders missing userId using customerEmail
  app.post('/api/admin/backfill-order-userids', async (req, res) => {
    try {
      const raw = await db.collection('orders').find({ $or: [ { userId: { $exists: false } }, { userId: '' } ] }).toArray();
      let updated = 0;
      for (const o of raw) {
        if (o.customerEmail) {
          const user = await storage.getUserByEmail(o.customerEmail);
            if (user) {
              await db.collection('orders').updateOne({ _id: o._id }, { $set: { userId: (user as any)._id?.toString?.() || (user as any).id } });
              updated++;
            }
        }
      }
      res.json({ scanned: raw.length, updated });
    } catch (e) {
      console.error('[backfill-order-userids] error', e);
      res.status(500).json({ message: 'Backfill failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Initialize collections with sample data
export async function initializeCollections() {
  try {
    // Insert sample order
    await storage.createOrder({
      userId: "sampleUserId",
      customerName: "John Doe",
      customerEmail: "john.doe@example.com",
      customerPhone: "1234567890",
      address: "123 Main St",
      city: "Sample City",
      pincode: "123456",
      items: [{ productId: "sampleProductId", quantity: 2 }],
      subtotal: 200,
      deliveryCharges: 20,
      total: 220,
    });

    // Insert sample contact
    await storage.createContact({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      subject: "Inquiry",
      message: "I have a question about your products.",
    });

    // Insert sample newsletter subscription
    await storage.subscribeNewsletter({
      email: "subscriber@example.com",
    });

    console.log("Collections initialized with sample data.");
  } catch (error) {
    console.error("Error initializing collections:", error);
  }
}
