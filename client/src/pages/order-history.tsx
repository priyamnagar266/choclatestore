import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../components/auth-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OrderItem {
  productId: string;
  quantity: number;
  name?: string;
  price?: number;
  image?: string;
}
interface OrderRecord {
  id: string;
  orderId: string;
  userId?: string;
  total: number;
  subtotal: number;
  deliveryCharges: number;
  status: string;
  razorpayPaymentId?: string | null;
  items: OrderItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string | null;
}

async function fetchOrderHistory(token: string): Promise<OrderRecord[]> {
  const res = await fetch("/api/orders/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch orders");
  return data.orders || [];
}

export default function OrderHistory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [filtered, setFiltered] = useState<OrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchOrderHistory(user.token);
        if (!cancelled) {
          setOrders(data);
          setFiltered(data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Apply filters
  useEffect(() => {
    let next = [...orders];
    if (statusFilter !== 'all') next = next.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      next = next.filter(o => o.items.some(it => it.name?.toLowerCase().includes(q)) || o.orderId.toLowerCase().includes(q));
    }
    setFiltered(next);
  }, [orders, statusFilter, search]);

  const totalSpent = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
  const completedCount = filtered.filter(o => o.status === 'completed').length;
  const pendingCount = filtered.filter(o => o.status !== 'completed').length;

  if (!user) return <div className="p-8">Please log in to view your orders.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setLocation('/')}>← Home</Button>
          <h2 className="text-3xl font-bold">Your Orders</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search item or order ID"
            className="border rounded px-3 py-2 text-sm w-56"
          />
        </div>
      </div>

      <Card className="bg-white/60 backdrop-blur border">
        <CardContent className="p-4 flex flex-wrap gap-6 text-sm">
          <div><span className="text-neutral-500">Orders:</span> {filtered.length}</div>
          <div><span className="text-neutral-500">Completed:</span> {completedCount}</div>
          <div><span className="text-neutral-500">Pending:</span> {pendingCount}</div>
            <div><span className="text-neutral-500">Total Spent:</span> ₹{totalSpent}</div>
        </CardContent>
      </Card>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && filtered.length === 0 && <div className="text-neutral-500">No matching orders.</div>}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(order => {
          const itemCount = order.items.reduce((s, it) => s + (it.quantity || 0), 0);
          return (
            <Card key={order.id} className="border shadow-sm hover:shadow-md transition-shadow group">
              <CardHeader className="pb-2 space-y-1">
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  <span className="font-mono tracking-wide">#{order.orderId?.slice?.(-8) || order.id}</span>
                  <Badge className={order.status === 'completed' ? 'bg-green-700' : 'bg-yellow-600'}>{order.status}</Badge>
                </CardTitle>
                <div className="text-[11px] text-neutral-500 flex justify-between">
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</span>
                  <span>{itemCount} item{itemCount!==1 && 's'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs grid gap-1">
                  <div className="font-medium text-neutral-700">{order.customerName}</div>
                  <div className="text-neutral-500 truncate" title={order.customerEmail}>{order.customerEmail}</div>
                  <div className="text-neutral-500">{order.customerPhone}</div>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-sm">Items</div>
                  <ul className="space-y-2">
                    {order.items.map((it, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        {it.image && <img src={it.image} alt={it.name} className="w-10 h-10 object-cover rounded border" />}
                        <div className="flex-1 text-sm">
                          <div className="flex justify-between">
                            <span>{it.name || `PID ${it.productId}`}</span>
                            <span className="text-neutral-500">× {it.quantity}</span>
                          </div>
                          {typeof it.price === 'number' && <div className="text-[11px] text-neutral-500">₹{it.price} each</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs border-t pt-3 grid gap-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>₹{order.deliveryCharges}</span></div>
                  <div className="flex justify-between font-semibold text-primary"><span>Total</span><span>₹{order.total}</span></div>
                  {order.razorpayPaymentId && <div className="mt-1 text-[10px] text-neutral-400 break-all">PID: {order.razorpayPaymentId}</div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
