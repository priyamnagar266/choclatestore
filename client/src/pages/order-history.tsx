import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../components/auth-context";
import { useAdminAuth } from "@/components/admin-auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Search, Package, Truck, CheckCircle2, Clock3, XCircle } from 'lucide-react';

interface OrderItem {
  productId: string;
  quantity: number;
  name?: string;
  price?: number;
}
interface OrderRecord {
  id: string;
  orderId: string;
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
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  // Allow either a storefront user or an admin session to view their own orders
  const authUser = user || adminUser; // unified object only for token/id usage
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'completed'|'cancelled'>('all');

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchOrderHistory(authUser.token);
        if (!cancelled) setOrders(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser]);

  const filtered = useMemo(()=>{
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!(`${o.orderId}`.toLowerCase().includes(term) || o.items.some(it=> (it.name||'').toLowerCase().includes(term)))) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  if (!authUser) return <div className="p-8 max-w-xl mx-auto"><Card><CardContent className='py-10 text-center text-sm'>Please log in to view your orders.</CardContent></Card></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Orders</h2>
          <p className='text-sm text-neutral-500 mt-1'>Track status, review items & payment information.</p>
        </div>
        <div className='flex flex-wrap gap-3 items-center'>
          <div className='relative'>
            <Search className='h-4 w-4 absolute left-2 top-2.5 text-neutral-400' />
            <Input placeholder='Search order or item' value={search} onChange={e=>setSearch(e.target.value)} className='pl-8 w-56' />
          </div>
          <div className='flex gap-2 text-xs'>
            {(['all','pending','completed','cancelled'] as const).map(s => (
              <button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1 rounded-full border text-[11px] font-medium transition ${statusFilter===s? 'bg-black text-white border-black':'hover:bg-neutral-100'}`}>{s}</button>
            ))}
          </div>
          <Button size='sm' variant='outline' onClick={()=>{
            setLoading(true);
            fetchOrderHistory(authUser.token).then(d=>setOrders(d)).catch(e=>setError(e.message)).finally(()=>setLoading(false));
          }} disabled={loading} className='gap-1'>
            <RefreshCw className={`h-4 w-4 ${loading? 'animate-spin':''}`} /> Refresh
          </Button>
        </div>
      </div>
      <Separator />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading && (
        <div className='grid md:grid-cols-2 xl:grid-cols-3 gap-6'>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} className='animate-pulse border rounded p-5 space-y-4 bg-white'>
              <div className='h-4 w-32 bg-neutral-200 rounded' />
              <div className='h-3 w-24 bg-neutral-200 rounded' />
              <div className='space-y-2 pt-2'>
                <div className='h-3 w-full bg-neutral-100 rounded' />
                <div className='h-3 w-5/6 bg-neutral-100 rounded' />
                <div className='h-3 w-2/3 bg-neutral-100 rounded' />
              </div>
              <div className='flex gap-2 pt-2'>
                <div className='h-6 w-16 bg-neutral-100 rounded-full' />
                <div className='h-6 w-10 bg-neutral-100 rounded-full' />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && <div className='text-sm text-neutral-500'>No orders match your filters.</div>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(order => (
          <Card key={order.id} className="border border-neutral-200 hover:shadow-md transition-shadow relative overflow-hidden bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base font-semibold">
                <span className='font-mono'>#{order.orderId?.slice?.(-8) || order.id}</span>
                <StatusPill status={order.status} />
              </CardTitle>
              <div className="text-xs text-neutral-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className='flex flex-col gap-2 text-xs'>
                <div className='flex flex-col gap-0.5'>
                  <span className='font-semibold text-neutral-700'>Customer</span>
                  <span>{order.customerName}</span>
                  <span className='text-neutral-500'>{order.customerEmail}</span>
                  <span className='text-neutral-500'>{order.customerPhone}</span>
                </div>
                <div>
                  <span className='font-semibold text-neutral-700'>Items</span>
                  <ul className='mt-1 space-y-1'>
                    {order.items.map((it, idx) => (
                      <li key={idx} className='flex justify-between gap-2'>
                        <span className='truncate'>{it.name || ('PID '+it.productId)}</span>
                        <span className='text-neutral-600'>× {it.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className='grid grid-cols-3 gap-2 text-center pt-2'>
                  <div className='bg-neutral-50 rounded p-1'>
                    <div className='text-[10px] uppercase tracking-wide text-neutral-500'>Subtotal</div>
                    <div className='font-semibold text-sm'>₹{order.subtotal}</div>
                  </div>
                  <div className='bg-neutral-50 rounded p-1'>
                    <div className='text-[10px] uppercase tracking-wide text-neutral-500'>Delivery</div>
                    <div className='font-semibold text-sm'>₹{order.deliveryCharges}</div>
                  </div>
                  <div className='bg-primary/10 rounded p-1'>
                    <div className='text-[10px] uppercase tracking-wide text-primary'>Total</div>
                    <div className='font-semibold text-sm text-primary'>₹{order.total}</div>
                  </div>
                </div>
                {order.razorpayPaymentId && (
                  <div className='text-[10px] text-neutral-500 pt-1 break-all'>PID: {order.razorpayPaymentId}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }:{ status:string }) {
  const map: Record<string,{label:string; className:string; icon:React.ReactNode}> = {
    pending: { label:'pending', className:'bg-amber-100 text-amber-700 border-amber-200', icon:<Clock3 className='h-3 w-3'/>},
    completed: { label:'completed', className:'bg-emerald-100 text-emerald-700 border-emerald-200', icon:<CheckCircle2 className='h-3 w-3'/>},
    cancelled: { label:'cancelled', className:'bg-red-100 text-red-600 border-red-200', icon:<XCircle className='h-3 w-3'/>},
  };
  const cfg = map[status] || { label: status, className:'bg-neutral-100 text-neutral-700 border-neutral-200', icon:<Package className='h-3 w-3'/>};
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.className}`}>{cfg.icon}{cfg.label}</span>;
}
