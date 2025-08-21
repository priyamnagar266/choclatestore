import mongoose, { Document } from "mongoose";
import { z } from "zod";

export interface Product extends Document {
  name: string;
  description: string;
  price: number;
  image: string;
  benefits: string[];
  category: string;
  inStock: number;
  // Optional nutritional information per serving
  energyKcal?: number;
  proteinG?: number;
  carbohydratesG?: number;
  totalSugarG?: number;
  addedSugarG?: number;
  totalFatG?: number;
  saturatedFatG?: number;
  transFatG?: number;
}

export interface Order extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  pincode: string;
  items: any[];
  subtotal: number;
  deliveryCharges: number;
  total: number;
  status: string;
  razorpayPaymentId?: string;
  createdAt: Date;
}

export interface Contact extends Document {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
}

export interface User extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
}

export interface Newsletter extends Document {
  email: string;
  subscribedAt: Date;
}

export const ProductModel = mongoose.model<Product>("Product", new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  benefits: { type: [String], required: true },
  category: { type: String, required: true },
  inStock: { type: Number, required: true, default: 100 },
}));

export const OrderModel = mongoose.model<Order>("Order", new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  items: { type: [{ type: mongoose.Schema.Types.Mixed }], required: true },
  subtotal: { type: Number, required: true },
  deliveryCharges: { type: Number, required: true },
  total: { type: Number, required: true },
  // Order status lifecycle: placed -> shipped -> out_for_delivery -> delivered (or cancelled)
  status: { type: String, required: true, default: "placed" },
  razorpayPaymentId: { type: String },
  createdAt: { type: Date, default: Date.now },
}));

export const ContactModel = mongoose.model<Contact>("Contact", new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}));

export const UserModel = mongoose.model<User>("User", new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: "user" },
  createdAt: { type: Date, default: Date.now },
}));

export const NewsletterModel = mongoose.model<Newsletter>("Newsletter", new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
}));

export const insertOrderSchema = z.object({
  userId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  address: z.string(),
  city: z.string(),
  pincode: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })),
  subtotal: z.number().positive(),
  deliveryCharges: z.number().nonnegative(),
  total: z.number().positive(),
});

export const insertContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  subject: z.string(),
  message: z.string(),
});

export const insertNewsletterSchema = z.object({
  email: z.string().email(),
});

export const insertUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
});
