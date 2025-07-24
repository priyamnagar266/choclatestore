import { db } from "./db";
import { type Product, type Order, type Contact, type Newsletter, type User } from "@shared/schema";
import { ObjectId } from "mongodb";

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
  async createOrder(order: any): Promise<Order> {
    const result = await ordersCollection.insertOne(order);
    console.log('[DEBUG createOrder] Inserted order:', order); // Debug log
    console.log('[DEBUG createOrder] Inserted ID:', result.insertedId); // Debug log
    let orderDoc = await ordersCollection.findOne({ _id: result.insertedId }) as (Order & { _id?: any }) | null;
    if (orderDoc && orderDoc._id) {
      orderDoc._id = orderDoc._id.toString();
    }
    return orderDoc!;
  },
  async getOrder(id: number): Promise<Order | undefined> {
    const objectId = new ObjectId(id);
    const result = await ordersCollection.findOne({ _id: objectId } as any);
    return result || undefined;
  },
  async updateOrderPayment(id: string, razorpayPaymentId: string, status: string): Promise<Order | undefined> {
    const objectId = new ObjectId(id);
    await ordersCollection.updateOne({ _id: objectId } as any, { $set: { razorpayPaymentId, status } });
    const result = await ordersCollection.findOne({ _id: objectId } as any);
    return result || undefined;
  },
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return await ordersCollection.find({ userId: new ObjectId(userId) } as any).toArray();
  },
  async createContact(contact: any): Promise<Contact> {
    const result = await contactsCollection.insertOne(contact);
    const contactDoc = await contactsCollection.findOne({ _id: result.insertedId });
    return contactDoc!;
  },
  async subscribeNewsletter(newsletter: any): Promise<Newsletter> {
    const result = await newslettersCollection.insertOne(newsletter);
    const newsletterDoc = await newslettersCollection.findOne({ _id: result.insertedId });
    return newsletterDoc!;
  },
  async createUser(user: any): Promise<User> {
    const result = await usersCollection.insertOne(user);
    const userDoc = await usersCollection.findOne({ _id: result.insertedId });
    return userDoc!;
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await usersCollection.findOne({ email });
    return result || undefined;
  },
};
