import { ProductModel, OrderModel, ContactModel, NewsletterModel, UserModel, Product, Order, Contact, Newsletter, User } from "@shared/schema";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;

  // Orders
  createOrder(order: Order): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  updateOrderPayment(id: number, razorpayPaymentId: string, status: string): Promise<Order | undefined>;
  getOrdersByUserId?(userId: number): Promise<Order[]>;

  // Contacts
  createContact(contact: Contact): Promise<Contact>;

  // Newsletter
  subscribeNewsletter(newsletter: Newsletter): Promise<Newsletter>;

  // Users
  createUser(user: User): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
}

export class MongoStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return ProductModel.find().exec();
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const product = await ProductModel.findOne({ id }).exec();
    return product ? product.toObject() : undefined;
  }

  async createOrder(order: Order): Promise<Order> {
    const newOrder = new OrderModel(order);
    await newOrder.save();
    return newOrder.toObject();
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const order = await OrderModel.findOne({ id }).exec();
    return order ? order.toObject() : undefined;
  }

  async updateOrderPayment(id: number, razorpayPaymentId: string, status: string): Promise<Order | undefined> {
    const order = await OrderModel.findOneAndUpdate(
      { id },
      { razorpayPaymentId, status },
      { new: true }
    ).exec();
    return order?.toObject();
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return OrderModel.find({ userId }).exec();
  }

  async createContact(contact: Contact): Promise<Contact> {
    const newContact = new ContactModel(contact);
    await newContact.save();
    return newContact.toObject();
  }

  async subscribeNewsletter(newsletter: Newsletter): Promise<Newsletter> {
    const newNewsletter = new NewsletterModel(newsletter);
    await newNewsletter.save();
    return newNewsletter.toObject();
  }

  async createUser(user: User): Promise<User> {
    const newUser = new UserModel(user);
    await newUser.save();
    return newUser.toObject();
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email }).exec();
    return user ? user.toObject() : undefined;
  }
}

export const storage = new MongoStorage();
