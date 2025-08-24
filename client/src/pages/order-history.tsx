import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search, Package, Truck, CheckCircle2, Clock3, XCircle } from 'lucide-react';

interface OrderItem { productId: string; quantity: number; name?: string; price?: number; image?: string; }
interface OrderRecord { id: string; orderId: string; total: number; subtotal: number; deliveryCharges: number; status: string; razorpayPaymentId?: string | null; items: OrderItem[]; customerName: string; customerEmail: string; customerPhone: string; createdAt: string | null; }

async function fetchOrderHistory(token: string): Promise<OrderRecord[]> {
  const headers: Record<string,string> = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await axios.get('/.netlify/functions/order-history', { headers });
  if (!data.success) throw new Error(data.error || 'Failed to fetch orders');
  return (data.orders || []).map((o: any) => ({
    id: o._id || o.id,
    orderId: o._id || o.id,
    total: o.total,
    subtotal: o.subtotal,
    deliveryCharges: o.deliveryCharges,
    status: o.status,
    razorpayPaymentId: o.razorpayPaymentId,
    items: o.items || [],
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    createdAt: o.createdAt,
  }));
}

export default function OrderHistory() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const authUser = user || adminUser;
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'placed'|'shipped'|'out_for_delivery'|'delivered'|'cancelled'>('all');
  const [productMap, setProductMap] = useState<Record<string,{name:string; image?:string}>>({});

  // load product catalog for mapping
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const res = await fetch('/products.json');
        if(!res.ok) return; const products = await res.json(); if(cancelled) return;
        const map: Record<string,{name:string; image?:string}> = {};
        (products||[]).forEach((p:any)=>{ map[String(p.id)] = { name:p.name, image:p.image }; });
        setProductMap(map);
      } catch {/* ignore */}
    })();
    return ()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    if(!authUser) return; let cancelled=false;
    (async()=>{
      setLoading(true); setError('');
      try { const data = await fetchOrderHistory(authUser.token); if(!cancelled) setOrders(data);} 
      catch(e:any){ if(!cancelled) setError(e.message);} 
      finally { if(!cancelled) setLoading(false);} 
    })();
    return ()=>{cancelled=true};
  },[authUser]);

  const filtered = useMemo(()=>{
    const term = search.toLowerCase();
    return orders.filter(o => {
      if(statusFilter!=='all' && o.status!==statusFilter) return false;
      if(term){
        const inOrderId = String(o.orderId).toLowerCase().includes(term);
        const inItems = o.items.some(it=> (it.name || productMap[it.productId]?.name || '').toLowerCase().includes(term));
        if(!(inOrderId || inItems)) return false;
      }
      return true;
    });
  },[orders, statusFilter, search, productMap]);

  if(!authUser){
    return React.createElement('div',{className:'p-8 max-w-xl mx-auto'},
      React.createElement(Card,null,
        React.createElement(CardContent,{className:'py-10 text-center text-sm'},'Please log in to view your orders.')
      )
    );
  }

  // helper render functions
  const renderStatusFilters = () => React.createElement('div',{className:'flex gap-2 text-xs'},
    (['all','placed','shipped','out_for_delivery','delivered','cancelled'] as const).map(s=>{
      const active = statusFilter===s;
      return React.createElement('button',{
        key:s,
        onClick:()=>setStatusFilter(s),
        className:(active? 'bg-black text-white border-black ':'hover:bg-neutral-100 ')+'px-3 py-1 rounded-full border text-[11px] font-medium transition'
      },s);
    })
  );

  const renderSkeletons = () => React.createElement('div',{className:'grid md:grid-cols-2 xl:grid-cols-3 gap-6'},
    Array.from({length:6}).map((_,i)=>React.createElement('div',{key:i,className:'animate-pulse border rounded p-5 space-y-4 bg-white'},
      React.createElement('div',{className:'h-4 w-32 bg-neutral-200 rounded'}),
      React.createElement('div',{className:'h-3 w-24 bg-neutral-200 rounded'}),
      React.createElement('div',{className:'space-y-2 pt-2'},
        React.createElement('div',{className:'h-3 w-full bg-neutral-100 rounded'}),
        React.createElement('div',{className:'h-3 w-5/6 bg-neutral-100 rounded'}),
        React.createElement('div',{className:'h-3 w-2/3 bg-neutral-100 rounded'}),
      ),
      React.createElement('div',{className:'flex gap-2 pt-2'},
        React.createElement('div',{className:'h-6 w-16 bg-neutral-100 rounded-full'}),
        React.createElement('div',{className:'h-6 w-10 bg-neutral-100 rounded-full'}),
      )
    ))
  );

  const renderOrderCard = (order:OrderRecord) => React.createElement(Card,{
    key:order.id,
    className:'border border-neutral-200 hover:shadow-md transition-shadow relative overflow-hidden bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60'
  },
    React.createElement(CardHeader,{className:'pb-2'},
      React.createElement(CardTitle,{className:'flex items-center justify-between text-base font-semibold'},
        React.createElement('span',{className:'font-mono'},'#'+(order.orderId?.slice?.(-8) || order.id)),
        React.createElement(StatusPill,{status:order.status})
      ),
      React.createElement('div',{className:'text-xs text-neutral-500'},order.createdAt? new Date(order.createdAt).toLocaleString():'-')
    ),
    React.createElement(CardContent,{className:'space-y-3'},
      React.createElement('div',{className:'flex flex-col gap-2 text-xs'},
        React.createElement('div',{className:'flex flex-col gap-0.5'},
          React.createElement('span',{className:'font-semibold text-neutral-700'},'Customer'),
          React.createElement('span',null,order.customerName),
          React.createElement('span',{className:'text-neutral-500'},order.customerEmail),
          React.createElement('span',{className:'text-neutral-500'},order.customerPhone),
        ),
        React.createElement('div',null,
          React.createElement('span',{className:'font-semibold text-neutral-700'},'Items'),
          React.createElement('ul',{className:'mt-1 space-y-1'},
            order.items.map((it,idx)=>{
              const meta = productMap[String(it.productId)] || {};
              const displayName = it.name || meta.name || ('PID '+it.productId);
              return React.createElement('li',{key:idx,className:'flex justify-between gap-2 items-center'},
                React.createElement('div',{className:'flex items-center gap-2 min-w-0'},
                  meta.image && React.createElement('img',{src:meta.image,alt:displayName,className:'h-8 w-8 rounded object-cover flex-shrink-0'}),
                  React.createElement('span',{className:'truncate text-xs font-medium'},displayName)
                ),
                React.createElement('span',{className:'text-neutral-600 text-xs'},'× '+it.quantity)
              );
            })
          )
        ),
        React.createElement('div',{className:'grid grid-cols-3 gap-2 text-center pt-2'},
          React.createElement('div',{className:'bg-neutral-50 rounded p-1'},
            React.createElement('div',{className:'text-[10px] uppercase tracking-wide text-neutral-500'},'Subtotal'),
            React.createElement('div',{className:'font-semibold text-sm'},'₹'+order.subtotal)
          ),
          React.createElement('div',{className:'bg-neutral-50 rounded p-1'},
            React.createElement('div',{className:'text-[10px] uppercase tracking-wide text-neutral-500'},'Delivery'),
            React.createElement('div',{className:'font-semibold text-sm'},'₹'+order.deliveryCharges)
          ),
            React.createElement('div',{className:'bg-primary/10 rounded p-1'},
              React.createElement('div',{className:'text-[10px] uppercase tracking-wide text-primary'},'Total'),
              React.createElement('div',{className:'font-semibold text-sm text-primary'},'₹'+order.total)
            ),
        ),
        order.razorpayPaymentId && React.createElement('div',{className:'text-[10px] text-neutral-500 pt-1 break-all'},'PID: '+order.razorpayPaymentId)
      )
    )
  );

  return React.createElement('div',{className:'max-w-6xl mx-auto p-6 space-y-6'},
    React.createElement('div',{className:'flex flex-col md:flex-row md:items-end md:justify-between gap-4'},
      React.createElement('div',null,
        React.createElement('h2',{className:'text-3xl font-bold tracking-tight'},'Your Orders'),
        React.createElement('p',{className:'text-sm text-neutral-500 mt-1'},'Track status, review items & payment information.')
      ),
      React.createElement('div',{className:'flex flex-wrap gap-3 items-center'},
        React.createElement('div',{className:'relative'},
          React.createElement(Search,{className:'h-4 w-4 absolute left-2 top-2.5 text-neutral-400'}),
          React.createElement(Input,{placeholder:'Search order or item',value:search,onChange:e=>setSearch(e.target.value),className:'pl-8 w-56'})
        ),
        renderStatusFilters(),
        React.createElement(Button,{size:'sm',variant:'outline',disabled:loading,onClick:()=>{
          setLoading(true);
          fetchOrderHistory(authUser.token).then(d=>setOrders(d)).catch(e=>setError(e.message)).finally(()=>setLoading(false));
        },className:'gap-1'},
          React.createElement(RefreshCw,{className:'h-4 w-4 '+(loading? 'animate-spin':'')}),' Refresh'
        )
      )
    ),
    React.createElement(Separator,null),
    error && React.createElement('div',{className:'text-red-500 text-sm'},error),
    loading && renderSkeletons(),
    !loading && filtered.length===0 && React.createElement('div',{className:'text-sm text-neutral-500'},'No orders match your filters.'),
    React.createElement('div',{className:'grid md:grid-cols-2 xl:grid-cols-3 gap-6'},filtered.map(renderOrderCard))
  );
}

function StatusPill({ status }:{ status:string }) {
  const icon = (Comp: any, extra='') => React.createElement(Comp,{className:'h-3 w-3 '+extra});
  const map: Record<string,{label:string; className:string; icon:React.ReactNode}> = {
    placed: { label:'placed', className:'bg-amber-100 text-amber-700 border-amber-200', icon:icon(Clock3)},
    shipped: { label:'shipped', className:'bg-blue-100 text-blue-700 border-blue-200', icon:icon(Truck)},
    out_for_delivery: { label:'out for delivery', className:'bg-indigo-100 text-indigo-700 border-indigo-200', icon:icon(Truck)},
    delivered: { label:'delivered', className:'bg-emerald-100 text-emerald-700 border-emerald-200', icon:icon(CheckCircle2)},
    cancelled: { label:'cancelled', className:'bg-red-100 text-red-600 border-red-200', icon:icon(XCircle)},
  };
  const cfg = map[status] || { label: status.replace(/_/g,' '), className:'bg-neutral-100 text-neutral-700 border-neutral-200', icon:icon(Package)};
  return React.createElement('span',{className:'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium '+cfg.className},cfg.icon,cfg.label);
}
