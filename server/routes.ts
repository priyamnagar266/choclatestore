import dotenv from "dotenv";
dotenv.config();

import type { Express } from "express";
import { createServer, type Server } from "http";
import Razorpay from "razorpay";
import { storage } from "./storage.mongodb";
import { insertOrderSchema, insertContactSchema, insertNewsletterSchema, insertUserSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { generateJWT, authenticateJWT } from "./jwt";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing required Razorpay credentials: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function registerRoutes(app: Express): Promise<Server> {
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

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("[Razorpay] Missing credentials:", process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);
        return res.status(500).json({ message: "Missing Razorpay credentials" });
      }

      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        receipt: `receipt_${Date.now()}`,
      };

      try {
        const order = await razorpay.orders.create(options);
        res.json({ 
          orderId: order.id,
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
      // @ts-ignore
      const userId = req.user.id;
      const orderData = insertOrderSchema.parse({ ...req.body, userId });
      const order = await storage.createOrder(orderData);
      console.log('[DEBUG /api/orders] Created order:', order); // Debug log
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: "Error creating order: " + error.message });
    }
  });

  // Verify Razorpay payment
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      // Debug log all received values
      console.log("[Razorpay Verification] Received:", {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        secret: process.env.RAZORPAY_KEY_SECRET
      });

      // Use import for crypto in ESM/TypeScript
      // Use require for CommonJS, import for ESM
      let crypto;
      try {
        crypto = require('crypto');
      } catch (e) {
        crypto = (await import('crypto')).default;
      }
      const secret = process.env.RAZORPAY_KEY_SECRET || '';
      const expectedSignature = crypto.createHmac("sha256", secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      console.log("[Razorpay Verification] Expected Signature:", expectedSignature);

      if (expectedSignature === razorpay_signature) {
        console.log("[Razorpay Verification] SUCCESS: Payment verified");
        res.json({ success: true, message: "Payment verified successfully" });
      } else {
        console.log("[Razorpay Verification] FAILURE: Invalid signature", { expectedSignature, razorpay_signature });
        res.status(400).json({ success: false, message: "Invalid payment signature" });
      }
    } catch (error: any) {
      console.log("[Razorpay Verification] ERROR:", error);
      res.status(500).json({ success: false, message: "Error verifying payment: " + error.message });
    }
  });

  // Update order with payment info
  app.patch("/api/orders/:id/payment", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { razorpayPaymentId, status } = req.body;
      
      const order = await storage.updateOrderPayment(orderId, razorpayPaymentId, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating order: " + error.message });
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
      const token = generateJWT({ id: newUser.id, email: newUser.email, role: newUser.role });
      res.json({ id: newUser.id, email: newUser.email, name: newUser.name, token });
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
      const token = generateJWT({ id: user.id, email: user.email, role: user.role });
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role, token });
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
    const userId = req.user.id;
    // For demo, return all orders (replace with user-specific logic if needed)
    const orders = await storage.getOrdersByUserId?.(userId) || [];
    res.json({ orders });
  });

  const httpServer = createServer(app);
  return httpServer;
}
