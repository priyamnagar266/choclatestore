import { products, orders, contacts, newsletters, type Product, type InsertProduct, type Order, type InsertOrder, type Contact, type InsertContact, type Newsletter, type InsertNewsletter, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  
  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  updateOrderPayment(id: number, razorpayPaymentId: string, status: string): Promise<Order | undefined>;
  getOrdersByUserId?(userId: number): Promise<Order[]>;
  
  // Contacts
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Newsletter
  subscribeNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;

  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private contacts: Map<number, Contact>;
  private newsletters: Map<number, Newsletter>;
  private users: Map<number, User> = new Map();
  private currentProductId: number;
  private currentOrderId: number;
  private currentContactId: number;
  private currentNewsletterId: number;
  private currentUserId: number = 1;

  constructor() {
    this.products = new Map();
    this.orders = new Map();
    this.contacts = new Map();
    this.newsletters = new Map();
    this.currentProductId = 1;
    this.currentOrderId = 1;
    this.currentContactId = 1;
    this.currentNewsletterId = 1;
    
    // Initialize with default products
    this.initializeProducts();
  }

  private initializeProducts() {
    const defaultProducts: Omit<Product, 'id'>[] = [
      {
        name: "Focus Boost",
        description: "Enhanced with Brahmi and almonds for laser-sharp mental clarity and sustained concentration.",
        price: "120.00",
        image: "https://pixabay.com/get/gfc1c2a70b7b3c679865932c4994da436b966dccdb56c17ccc03fe83ae24b5796aee9a8fe0056640bc159e553bb3f87acf043abe91ecb685e816ccba6a3f2ed2c_1280.jpg",
        benefits: ["Enhanced Focus", "Brain Health"],
        category: "cognitive",
        inStock: 100,
      },
      {
        name: "Mood Uplift",
        description: "Rich cocoa blended with Ashwagandha to naturally elevate your mood and reduce stress.",
        price: "130.00",
        image: "https://pixabay.com/get/g3439f0a84f01c5a84d4508ca5a26781daf31c6229edd451704b6da5264d5ec31f764eba7e683f11e1b44238783b0ec8d_1280.jpg",
        benefits: ["Mood Booster", "Stress Relief"],
        category: "mood",
        inStock: 100,
      },
      {
        name: "Energy Supreme",
        description: "Power-packed with dates, nuts, and ginseng for sustained energy throughout your day.",
        price: "125.00",
        image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        benefits: ["Sustained Energy", "Pre-Workout"],
        category: "energy",
        inStock: 100,
      },
      {
        name: "Memory Master",
        description: "Turmeric and walnut fusion designed to enhance memory retention and cognitive function.",
        price: "135.00",
        image: "https://images.unsplash.com/photo-1511909525232-61113c912358?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        benefits: ["Memory Boost", "Cognitive Health"],
        category: "cognitive",
        inStock: 100,
      },
      {
        name: "Antioxidant Rich",
        description: "Loaded with berries, cocoa, and amla for powerful antioxidant protection and cellular health.",
        price: "140.00",
        image: "https://images.unsplash.com/photo-1557142046-c704a3adf364?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        benefits: ["Antioxidants", "Immunity"],
        category: "health",
        inStock: 100,
      },
      {
        name: "Protein Power",
        description: "High-protein blend with hemp seeds and quinoa, perfect for muscle recovery and growth.",
        price: "145.00",
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        benefits: ["High Protein", "Post-Workout"],
        category: "fitness",
        inStock: 100,
      },
      {
        name: "Digestive Wellness",
        description: "Ginger and fiber-rich ingredients to support healthy digestion and gut wellness.",
        price: "128.00",
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        benefits: ["Digestive Health", "Gut Friendly"],
        category: "wellness",
        inStock: 100,
      },
      {
        name: "Sleep & Calm",
        description: "Evening blend with chamomile and jatamansi for natural relaxation and better sleep quality.",
        price: "132.00",
        image: "https://pixabay.com/get/gf56acb65bf33f3445884aee69376da6767312b5242d0f0fdd8b29b5aa58205cd9882c5a5e125d4ab3cc39c17ee40abcab0dfe576a424ce75666d24f2e92dc52e_1280.jpg",
        benefits: ["Relaxation", "Sleep Support"],
        category: "wellness",
        inStock: 100,
      },
    ];

    defaultProducts.forEach(product => {
      const id = this.currentProductId++;
      this.products.set(id, { ...product, id });
    });
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      ...insertOrder,
      id,
      _id: String(id), // Always return _id as string for MongoDB-like compatibility
      status: "pending",
      razorpayPaymentId: null,
      createdAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async updateOrderPayment(id: number, razorpayPaymentId: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      order.razorpayPaymentId = razorpayPaymentId;
      order.status = status;
      this.orders.set(id, order);
      return order;
    }
    return undefined;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = {
      ...insertContact,
      id,
      createdAt: new Date(),
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async subscribeNewsletter(insertNewsletter: InsertNewsletter): Promise<Newsletter> {
    const id = this.currentNewsletterId++;
    const newsletter: Newsletter = {
      ...insertNewsletter,
      id,
      subscribedAt: new Date(),
    };
    this.newsletters.set(id, newsletter);
    return newsletter;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date(),
      role: user.role ?? "user",
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }
}

export const storage = new MemStorage();
