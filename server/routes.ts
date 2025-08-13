import dotenv from "dotenv";
dotenv.config();

import type { Express } from "express";
import { createServer, type Server } from "http";
import Razorpay from "razorpay";
import { storage } from "./storage.mongodb";
import { db } from './db';
import { insertOrderSchema, insertContactSchema, insertNewsletterSchema, insertUserSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { generateJWT, authenticateJWT } from "./jwt";
import crypto from "crypto";
import cors from "cors";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing required Razorpay credentials: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function registerRoutes(app: Express): Promise<Server> {
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
      const products = await storage.getProducts();
      res.json(products);
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

  // Create Razorpay order
  app.post("/api/create-order", async (req, res) => {
    try {
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
      const newUser = await storage.createUser({ ...userData, password: hashedPassword });
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
        status: o.status || 'pending',
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
        status: o.status || 'pending',
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
