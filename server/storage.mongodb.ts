import { db } from "./db";
import { type Product, type Order, type Contact, type Newsletter, type User } from "@shared/schema";
import { ObjectId } from "mongodb";

const productsCollection = db.collection<Product>("products");
const ordersCollection = db.collection<Order>("orders");
const contactsCollection = db.collection<Contact>("contacts");
const newslettersCollection = db.collection<Newsletter>("newsletters");
const usersCollection = db.collection<User>("users");
const settingsCollection = db.collection<any>('settings');

export const storage = {
  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const result = await productsCollection.findOne({ slug });
    return result || undefined;
  },
  async getProducts(): Promise<Product[]> {
    return await productsCollection.find().toArray();
  },
  async getProduct(id: number): Promise<Product | undefined> {
    const result = await productsCollection.findOne({ id });
    return result || undefined;
  },
  async createProduct(data: any): Promise<Product> {
    // Auto-increment numeric id field based on current max id
    const existingIds = await productsCollection.find({}, { projection: { id: 1 } as any }).toArray();
    const maxId = existingIds.length ? Math.max(...existingIds.map((p: any) => p.id || 0)) : 0;
    const nextId = maxId + 1;
  const doc = { id: nextId, benefits: [], inStock: 0, bestseller: false, ...data };
  console.log('[storage.createProduct] inserting', doc);
    await productsCollection.insertOne(doc as any);
    return doc as any;
  },
  async updateProduct(id: number, data: any): Promise<Product | undefined> {
    await productsCollection.updateOne({ id } as any, { $set: data });
    const updated = await productsCollection.findOne({ id } as any);
    return updated || undefined;
  },
  async deleteProduct(id: number): Promise<boolean> {
    const res = await productsCollection.deleteOne({ id } as any);
    return res.deletedCount === 1;
  },
  async deleteProducts(ids: number[]): Promise<number> {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const res = await productsCollection.deleteMany({ id: { $in: ids } } as any);
    return res.deletedCount || 0;
  },
  async listProductsPaginated(page: number, pageSize: number, search?: string): Promise<{ products: Product[]; total: number; page: number; pageSize: number; }> {
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await productsCollection.countDocuments(query);
    const skip = (page - 1) * pageSize;
  const docs = await productsCollection.find(query).sort({ id: 1 }).skip(skip).limit(pageSize).toArray();
    return { products: docs as any, total, page, pageSize };
  },
  async createOrder(order: any): Promise<Order> {
    // Ensure createdAt is always set (frontend may omit)
    if (!order.createdAt) {
      order.createdAt = new Date();
    }
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
    // Support orders stored with userId as raw string or ObjectId
    let objectId: ObjectId | null = null;
    try {
      objectId = new ObjectId(userId);
    } catch {}
    const query: any = objectId ? { $or: [ { userId }, { userId: objectId } ] } : { userId };
    return await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();
  },
  async getOrdersByCustomerEmail(email: string): Promise<Order[]> {
    return await ordersCollection.find({ customerEmail: email }).sort({ createdAt: -1 }).toArray();
  },
  async getRecentOrders(limit: number = 10): Promise<Order[]> {
    return await ordersCollection.find().sort({ createdAt: -1 }).limit(limit).toArray();
  },
  async getOrderStats(): Promise<any> {
    const totalOrders = await ordersCollection.countDocuments();
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);
    const todayOrders = await ordersCollection.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } } as any);
    // Sum total revenue (guard missing field)
    const revenueAgg = await ordersCollection.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: { $ifNull: [ "$total", 0 ] } } } }
    ]).toArray();
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    // Status counts
    const statusAgg = await ordersCollection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();
    const statusCounts: Record<string, number> = {};
    for (const s of statusAgg) {
      if (s?._id) statusCounts[s._id] = s.count;
      else statusCounts['unknown'] = s.count;
    }
  // Additional product/user metrics
  const totalProducts = await productsCollection.countDocuments();
  const totalUsers = await usersCollection.countDocuments();
  const lowStockThreshold = 5;
  const lowStockProducts = await productsCollection.countDocuments({ inStock: { $lte: lowStockThreshold } } as any);
    const placedOrders = statusCounts['placed'] || 0;
  return { totalOrders, totalRevenue, todayOrders, statusCounts, totalProducts, totalUsers, lowStockProducts, pendingOrders: placedOrders };
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
  async countAdmins(): Promise<number> {
    return usersCollection.countDocuments({ role: 'admin' } as any);
  },
  async updateUserRole(userId: string, role: string): Promise<boolean> {
    try {
      const objectId = new ObjectId(userId);
      const res = await usersCollection.updateOne({ _id: objectId } as any, { $set: { role } });
      return res.modifiedCount === 1;
    } catch {
      // fallback attempt by string id field if stored differently
      const res = await usersCollection.updateOne({ id: userId } as any, { $set: { role } });
      return res.modifiedCount === 1;
    }
  },
  async getUserById(userId: string): Promise<User | undefined> {
    try {
      const objectId = new ObjectId(userId);
      const result = await usersCollection.findOne({ _id: objectId } as any);
      return result || undefined;
    } catch {
      const result = await usersCollection.findOne({ id: userId } as any);
      return result || undefined;
    }
  },
  async getOverviewStats(): Promise<any> {
    // Total orders & sales
    const totalOrders = await ordersCollection.countDocuments();
    const salesAgg = await ordersCollection.aggregate([
      { $group: { _id: null, totalSales: { $sum: { $ifNull: [ "$total", 0 ] } } } }
    ]).toArray();
    const totalSales = salesAgg[0]?.totalSales || 0;
    // Pending orders
  const pendingOrders = await ordersCollection.countDocuments({ status: 'placed' } as any);
    // Total customers (distinct customerEmail)
    const distinctCustomers = await ordersCollection.distinct('customerEmail');
    const totalCustomers = distinctCustomers.filter(c => !!c).length;
    // Monthly sales last 12 months
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyAgg = await ordersCollection.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: { $ifNull: [ '$total', 0 ] } } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]).toArray();
    const monthlySales = monthlyAgg.map(r => ({ month: `${r._id.y}-${String(r._id.m).padStart(2,'0')}`, total: r.total }));
    // Payment method distribution (inferred)
    const paymentAgg = await ordersCollection.aggregate([
      { $group: { _id: { online: { $cond: [ { $ifNull: [ '$razorpayPaymentId', false ] }, true, false ] } }, count: { $sum: 1 } } }
    ]).toArray();
    const paymentMethodDistribution = paymentAgg.map(p => ({ method: p._id.online ? 'online' : 'unknown', value: p.count }));
    return { totalSales, totalOrders, totalCustomers, pendingOrders, monthlySales, paymentMethodDistribution };
  },
  // Admin: list orders with filters & pagination
  async listOrders(filters: { status?: string; paymentStatus?: string; startDate?: string; endDate?: string }, page: number, pageSize: number): Promise<{ orders: any[]; total: number; page: number; pageSize: number; }> {
    const query: any = {};
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'paid') {
        query.razorpayPaymentId = { $exists: true, $ne: null, $nin: [''] } as any;
      } else if (filters.paymentStatus === 'unpaid') {
        query.$or = [
          { razorpayPaymentId: { $exists: false } },
          { razorpayPaymentId: null },
          { razorpayPaymentId: '' }
        ];
      }
    }
    if (filters.startDate || filters.endDate) {
      const range: any = {};
      if (filters.startDate) {
        range.$gte = new Date(filters.startDate + 'T00:00:00.000Z');
      }
      if (filters.endDate) {
        range.$lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
      query.createdAt = range;
    }
    const skip = (page - 1) * pageSize;
    const cursor = ordersCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize);
    const ordersRaw = await cursor.toArray();
    const total = await ordersCollection.countDocuments(query);
    const orders = ordersRaw.map(o => ({
      id: (o as any)._id?.toString?.() || (o as any).id,
      customerName: (o as any).customerName,
      customerEmail: (o as any).customerEmail,
      customerPhone: (o as any).customerPhone,
      total: (o as any).total,
  status: (o as any).status || 'placed',
      paymentStatus: (o as any).razorpayPaymentId ? 'paid' : 'unpaid',
      razorpayPaymentId: (o as any).razorpayPaymentId || null,
      createdAt: (o as any).createdAt,
      items: Array.isArray((o as any).items) ? (o as any).items.map((it: any) => ({
        productId: it.productId,
        quantity: it.quantity,
        variantLabel: it.variantLabel,
        name: it.name,
        price: it.price
      })) : []
    }));
    return { orders, total, page, pageSize };
  },
  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  const allowed = ['placed','shipped','out_for_delivery','delivered','cancelled'];
    if (!allowed.includes(status)) return false;
    try {
      const objectId = new ObjectId(orderId);
      const res = await ordersCollection.updateOne({ _id: objectId } as any, { $set: { status } });
      return res.modifiedCount === 1;
    } catch (e) {
      return false;
    }
  },
  async listCustomersWithStats(page: number, pageSize: number, search?: string, startDate?: string, endDate?: string): Promise<{ customers: any[]; total: number; page: number; pageSize: number; }> {
    const match: any = {};
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) match.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    const skip = (page - 1) * pageSize;
    const pipeline: any[] = [
      { $match: match },
      { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'ordersRaw' } },
      { $addFields: {
          ordersCount: { $size: '$ordersRaw' },
          totalSpend: { $sum: { $map: { input: '$ordersRaw', as: 'o', in: { $ifNull: ['$$o.total', 0] } } } }
        }
      },
      { $project: { ordersRaw: 0, password: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize }
    ];
    const countPipeline: any[] = [ { $match: match }, { $count: 'total' } ];
    const [rows, countRes] = await Promise.all([
      usersCollection.aggregate(pipeline).toArray(),
      usersCollection.aggregate(countPipeline).toArray()
    ]);
    const total = countRes[0]?.total || 0;
    const customers = rows.map(r => ({
      id: (r as any)._id?.toString?.(),
      name: (r as any).name,
      email: (r as any).email,
      createdAt: (r as any).createdAt,
      ordersCount: (r as any).ordersCount,
      totalSpend: (r as any).totalSpend,
      role: (r as any).role
    }));
    return { customers, total, page, pageSize };
  }
  ,
  async getSalesReport(startDate?: string, endDate?: string): Promise<{ monthlySales: any[]; topProducts: any[]; categorySales: any[]; range: { start: Date; end: Date; }; }> {
    // Determine date range (default last 6 months)
    const now = new Date();
    let start: Date;
    let end: Date;
    if (startDate) start = new Date(startDate + 'T00:00:00.000Z'); else start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    if (endDate) end = new Date(endDate + 'T23:59:59.999Z'); else end = now;
    if (start > end) [start, end] = [end, start];

    // Fetch orders in range
    const orders = await ordersCollection.find({ createdAt: { $gte: start, $lte: end } } as any).toArray();
    if (!orders.length) {
      return { monthlySales: [], topProducts: [], categorySales: [], range: { start, end } };
    }
    // Product map for name/category/price (approx revenue multiplication by current price)
    const products = await productsCollection.find().toArray();
    const productMap: Record<string, any> = {};
    for (const p of products as any[]) {
      if (p.id !== undefined) productMap[String(p.id)] = p;
      if ((p as any)._id) productMap[String((p as any)._id)] = p;
    }
    // Aggregation containers
    const monthly: Record<string, { total: number; orders: number; } > = {};
    const productAgg: Record<string, { productId: string; name: string; totalQuantity: number; totalRevenue: number; } > = {};
    const categoryAgg: Record<string, { category: string; totalQuantity: number; totalRevenue: number; } > = {};

    for (const o of orders as any[]) {
      const d = new Date(o.createdAt || o._id?.getTimestamp?.() || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!monthly[key]) monthly[key] = { total: 0, orders: 0 };
      monthly[key].total += (o.total || 0);
      monthly[key].orders += 1;
      if (Array.isArray(o.items)) {
        for (const it of o.items) {
          const pidRaw = String(it.productId);
          const prod = productMap[pidRaw] || productMap[String(parseInt(pidRaw))];
          const price = prod?.price || 0;
          const quantity = it.quantity || 0;
            // approximate revenue: current price * quantity (unless future we store line price)
          if (!productAgg[pidRaw]) productAgg[pidRaw] = { productId: pidRaw, name: prod?.name || pidRaw, totalQuantity: 0, totalRevenue: 0 };
          productAgg[pidRaw].totalQuantity += quantity;
          productAgg[pidRaw].totalRevenue += price * quantity;
          const category = prod?.category || 'uncategorized';
          if (!categoryAgg[category]) categoryAgg[category] = { category, totalQuantity: 0, totalRevenue: 0 };
          categoryAgg[category].totalQuantity += quantity;
          categoryAgg[category].totalRevenue += price * quantity;
        }
      }
    }
    const monthlySales = Object.entries(monthly)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([month,val]) => ({ month, total: val.total, orders: val.orders }));
    const topProducts = Object.values(productAgg)
      .sort((a,b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 15);
    const categorySales = Object.values(categoryAgg)
      .sort((a,b) => b.totalRevenue - a.totalRevenue);
    return { monthlySales, topProducts, categorySales, range: { start, end } };
  },
  async getStoreSettings(): Promise<{ currency: string; taxRate: number; shippingCharges: number; }> {
    const doc = await settingsCollection.findOne({ key: 'storeSettings' });
    return {
      currency: doc?.currency || 'INR',
      taxRate: typeof doc?.taxRate === 'number' ? doc.taxRate : 0,
      shippingCharges: typeof doc?.shippingCharges === 'number' ? doc.shippingCharges : 0
    };
  },
  async updateStoreSettings(update: Partial<{ currency: string; taxRate: number; shippingCharges: number; }>): Promise<void> {
    await settingsCollection.updateOne({ key: 'storeSettings' }, { $set: { key: 'storeSettings', ...update } }, { upsert: true });
  }
};
