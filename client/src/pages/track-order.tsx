import React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatPrice } from '@/lib/products';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';

interface TrackedOrderItem { productId: string; quantity: number; name?: string; image?: string; netWeight?: string; }
interface TrackedOrder { orderId: string; status: string; createdAt: string | null; total: number; items: TrackedOrderItem[]; eta?: string | null; }

const STATUS_LABEL: Record<string,string> = { placed:'Order Placed', shipped:'Shipped', out_for_delivery:'Out for Delivery', delivered:'Delivered', cancelled:'Cancelled' };

const h = React.createElement;

export default function TrackOrderPage(){
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  React.useEffect(()=>{ if (user) window.location.replace('/order-history'); }, [user]);

  const { data, isFetching, refetch } = useQuery<{ orders: TrackedOrder[] }>({
    queryKey:['track-orders', submittedEmail],
    queryFn: async ()=>{
      if (!submittedEmail) return { orders: [] };
  // Hitting Netlify serverless (redirect in netlify.toml). If offline dev falls back to backend.
  const res = await fetch('/api/orders/track', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email: submittedEmail }) });
      if (!res.ok) { let msg='Failed to fetch orders'; try { const j= await res.json(); if(j?.message) msg=j.message; } catch{} throw new Error(msg); }
      return res.json();
    },
    enabled: !!submittedEmail
  });

  const onSubmit = (e: React.FormEvent)=>{ e.preventDefault(); if(!email.trim()){ toast({ title:'Enter email', variant:'destructive'}); return; } setSubmittedEmail(email.trim()); refetch(); };

  const orders = data?.orders || [];

  return h('div',{className:'min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e6eef3] py-12 px-4'},
    h('div',{className:'max-w-2xl mx-auto bg-white/80 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-8 space-y-8'},
      h('div',{className:'space-y-2 text-center'},
        h('h1',{className:'text-3xl font-bold tracking-tight text-primary'},'Track Your Order'),
        h('p',{className:'text-sm text-muted-foreground'},'Enter the email used during checkout to view recent orders.')
      ),
      h('form',{onSubmit,onKeyDown:(e:any)=>{ if(e.key==='Enter' && !email) e.preventDefault(); }, className:'flex flex-col sm:flex-row gap-4'},
        h('input',{type:'email', required:true, placeholder:'you@example.com', value:email, onChange:(e:any)=>setEmail(e.target.value), className:'flex-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none bg-white'}),
        h('button',{type:'submit', className:'h-12 px-6 rounded-lg bg-primary text-white font-semibold disabled:opacity-60'}, isFetching ? 'Searching...' : 'Track')
      ),
      submittedEmail && !isFetching && orders.length===0 ? h('div',{className:'text-center text-sm text-muted-foreground pt-2'},'No orders found for this email.') : null,
      orders.length>0 ? h('div',{className:'space-y-4'},
        orders.map(o => h('div',{key:o.orderId,className:'border border-gray-200 rounded-xl bg-white p-5 flex flex-col gap-3 shadow-sm'},
          h('div',{className:'flex flex-wrap items-center justify-between gap-2'},
            h('div',{className:'flex flex-col'},
              h('span',{className:'text-xs font-mono text-gray-500'},'#'+(o.orderId||'').slice(-8)),
              h('span',{className:'text-sm font-semibold'}, STATUS_LABEL[o.status] || o.status)
            ),
            h('div',{className:'text-right text-xs text-gray-500'},
              o.createdAt ? h('div',{},'Placed: '+ new Date(o.createdAt).toLocaleDateString()) : null,
              o.eta ? h('div',{className:'text-green-700 font-medium'},'ETA: '+ new Date(o.eta).toLocaleDateString()) : null
            )
          ),
          h('div',{className:'flex flex-col gap-2'},
            o.items.map(it => h('div',{key:it.productId+String(it.quantity),className:'flex items-center gap-3'},
              it.image ? h('img',{src:it.image, alt:it.name||'Product', className:'w-12 h-12 rounded object-cover border'}) : null,
              h('div',{className:'flex-1'},
                h('div',{className:'text-sm font-medium line-clamp-1'}, `${it.name || 'Product'}${it.netWeight ? `(${it.netWeight})` : ''}`),
                h('div',{className:'text-xs text-gray-500'}, 'Qty: '+it.quantity)
              )
            ))
          ),
          h('div',{className:'flex justify-between items-center pt-2 border-t mt-2'},
            h('span',{className:'text-xs text-gray-500'},'Total'),
            h('span',{className:'text-sm font-semibold'}, formatPrice(o.total))
          )
        ))
      ) : null
    )
  );
}
