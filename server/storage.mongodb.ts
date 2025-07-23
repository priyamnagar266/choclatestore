import { db } from "./db";
import { type Product, type InsertProduct, type Order, type InsertOrder, type Contact, type InsertContact, type Newsletter, type InsertNewsletter, type User, type InsertUser } from "@shared/schema";

const productsCollection = db.collection<Product>("products");
const ordersCollection = db.collection<Order>("orders");
const contactsCollection = db.collection<Contact>("contacts");
const newslettersCollection = db.collection<Newsletter>("newsletters");
const usersCollection = db.collection<User>("users");

export const storage = {
  async getProducts(): Promise<Product[]> {
    return await productsCollection.find().toArray();
  },
  async getProduct(id: number): Promise<Product | undefined> {
    const result = await productsCollection.findOne({ id });
    return result || undefined;
  },
  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await ordersCollection.insertOne(order as Order);
    console.log('[DEBUG createOrder] Inserted order:', order); // Debug log
    console.log('[DEBUG createOrder] Inserted ID:', result.insertedId); // Debug log
    let orderDoc = await ordersCollection.findOne({ _id: result.insertedId });
    if (orderDoc && orderDoc._id) {
      orderDoc._id = orderDoc._id.toString();
    }
    return orderDoc!;
  },
  async getOrder(id: number): Promise<Order | undefined> {
    const result = await ordersCollection.findOne({ id });
    return result || undefined;
  },
  async updateOrderPayment(id: number, razorpayPaymentId: string, status: string): Promise<Order | undefined> {
    await ordersCollection.updateOne({ id }, { $set: { razorpayPaymentId, status } });
    const result = await ordersCollection.findOne({ id });
    return result || undefined;
  },
  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return await ordersCollection.find({ userId }).toArray();
  },
  async createContact(contact: InsertContact): Promise<Contact> {
    const result = await contactsCollection.insertOne(contact as Contact);
    const contactDoc = await contactsCollection.findOne({ _id: result.insertedId });
    return contactDoc!;
  },
  async subscribeNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    const result = await newslettersCollection.insertOne(newsletter as Newsletter);
    const newsletterDoc = await newslettersCollection.findOne({ _id: result.insertedId });
    return newsletterDoc!;
  },
  async createUser(user: InsertUser): Promise<User> {
    const result = await usersCollection.insertOne(user as User);
    const userDoc = await usersCollection.findOne({ _id: result.insertedId });
    return userDoc!;
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await usersCollection.findOne({ email });
    return result || undefined;
  },
};
