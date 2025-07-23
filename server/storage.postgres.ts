import { db } from "./db";
import { products, orders, contacts, newsletters, users, type Product, type InsertProduct, type Order, type InsertOrder, type Contact, type InsertContact, type Newsletter, type InsertNewsletter, type User, type InsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";

// Deprecated: This file is no longer used. Please use storage.mongodb.ts for MongoDB storage.
