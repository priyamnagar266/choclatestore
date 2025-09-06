import { useRef, useState } from 'react';
// Product name/price/variants resolution cache (populated on-demand via /api/products)
let productMap: Record<string,{name:string; price?:number; netWeight?:string; variants?: { label:string; price:number; salePrice?:number }[]}>|null = null;
async function ensureProductMap(){
  if(productMap) return productMap;
  productMap = {};
  try {
    const res = await fetch('/api/products');
    if(res.ok){
      const list:any[] = await res.json();
      for(const p of list){
  const entry = { name: p.name, price: p.price, netWeight: p.netWeight, variants: Array.isArray(p.variants)? p.variants.map((v:any)=>({ label:v.label, price:v.price, salePrice:v.salePrice })) : undefined };
        if(p?._id) productMap[p._id] = entry;
        if(p?.id!==undefined) productMap[String(p.id)] = entry;
        if(p?.slug) productMap[p.slug] = entry;
        // Also index variant-specific keys id::label for direct hits
        if(entry.variants){
          const baseKeys = [p._id, p.id!==undefined? String(p.id):null, p.slug].filter(Boolean) as string[];
          for(const bk of baseKeys){
            for(const v of entry.variants){
              productMap[`${bk}::${v.label}`] = { name: `${p.name} (${v.label})`, price: (v.salePrice!=null && v.salePrice < v.price) ? v.salePrice : v.price } as any;
            }
          }
        }
      }
    }
  } catch{}
  return productMap;
}
async function resolveProduct(it:any){
  // If already has name & price, return early
  if (it.name && it.price !== undefined) return it;
  const map = await ensureProductMap();
  const keysToTry: string[] = [];
  if (it.productId) keysToTry.push(String(it.productId));
  if (it.id) keysToTry.push(String(it.id));
  // If productId looks like a Mongo ObjectId, keep as is but also push lowercase
  if (it.productId && /^[a-fA-F0-9]{24}$/.test(String(it.productId))) {
    keysToTry.push(String(it.productId).toLowerCase());
  }
  // Some orders may have stored baseProductId; include variant-trimmed component
  if (it.baseProductId) keysToTry.push(String(it.baseProductId));
  // Try stripping any variant suffix pattern id::variant
  if (it.productId && String(it.productId).includes('::')) {
    keysToTry.push(String(it.productId).split('::')[0]);
  }
  let found: any = null;
  for (const k of keysToTry) {
    if (map[k]) { found = map[k]; break; }
  }
  if (found) {
    if (!it.name) it.name = found.name;
    if (it.price === undefined || it.price === 0) {
      // Try variant-specific price if variant label present
      if (it.variantLabel && found.variants) {
        const v = found.variants.find((v: any)=> (v.label||'').toLowerCase() === String(it.variantLabel).toLowerCase());
        if (v) it.price = (v.salePrice!=null && v.salePrice < v.price) ? v.salePrice : v.price;
      }
      if (it.price === undefined || it.price === 0) it.price = found.price;
    }
  } else if (it.variantLabel) {
    // Direct attempt with composite key if not previously included
    const composite = map[`${it.productId}::${it.variantLabel}`];
    if (composite) {
      if (!it.name) it.name = composite.name;
      if (!it.price) it.price = composite.price;
    }
  }
  // Ultimate fallback: keep placeholder but avoid 'Unknown'
  if (!it.name) it.name = 'Product';
  return it;
}
import { AdminLayout } from '@/components/admin-nav';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface OrderRow { id: string; total: number; subtotal?: number; discount?: number; deliveryCharges?: number; status: string; paymentStatus: string; createdAt: string; customerName?: string; customerEmail?: string; items: { productId: string; quantity: number; variantLabel?: string; name?: string; price?: number }[]; }

export default function AdminOrders(){
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const qc = useQueryClient();
  const [page,setPage] = useState(1);
  const pageSize = 20;
  const [statusFilter,setStatusFilter] = useState('all');
  const [paymentFilter,setPaymentFilter] = useState('all');
  const [startDate,setStartDate] = useState('');
  const [endDate,setEndDate] = useState('');
  const [selected,setSelected] = useState<string[]>([]);
  const [labelFormat,setLabelFormat] = useState<'A4'|'A6'>('A4');
  const pdfCtorRef = useRef<any>(null);

  const { data,isLoading,error } = useQuery<{orders:OrderRow[]; total:number; page:number; pageSize:number}>({
    queryKey:['admin-orders',page,statusFilter,paymentFilter,startDate,endDate],
    queryFn: async()=>{
      const params = new URLSearchParams({ page:String(page), pageSize:String(pageSize) });
      if (statusFilter!=='all') params.append('status',statusFilter);
      if (paymentFilter!=='all') params.append('paymentStatus',paymentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`/api/admin/orders?${params.toString()}`, { headers:{ Authorization:`Bearer ${token}` }});
      if (!res.ok) throw new Error('Failed to load orders');
      return res.json();
    },
    enabled: !!token
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id:string; status:string }) => {
      const res = await fetch(`/api/admin/orders/${id}/status`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: ()=>{ qc.invalidateQueries({ queryKey:['admin-orders'] }); qc.invalidateQueries({ queryKey:['admin-metrics'] }); }
  });

  const totalPages = data ? Math.ceil((data.total||0)/pageSize) : 1;
  const allVisibleSelected = !!data?.orders?.length && selected.length === data.orders.length;
  const toggleSelect = (id:string)=> setSelected((s: string[])=> s.includes(id) ? s.filter((i:string)=>i!==id) : [...s,id]);
  const toggleSelectAll = ()=>{ if(!data?.orders) return; setSelected(allVisibleSelected? [] : data.orders.map(o=>o.id)); };

  const getPdfCtor = async () => {
    if (!pdfCtorRef.current) {
      const mod: any = await import('jspdf');
      pdfCtorRef.current = mod.jsPDF || mod.default || mod.JsPDF || mod.JSPDF;
    }
    return pdfCtorRef.current;
  };

  const fetchDetail = async (orderId:string): Promise<any> => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { headers:{ Authorization:`Bearer ${token}` }});
      if (!res.ok) throw new Error('status '+res.status);
      const ct = res.headers.get('content-type')||'';
      if (!/json/i.test(ct)) throw new Error('non-json');
      return await res.json();
    } catch (e) {
      const row = data?.orders.find(o=>o.id===orderId);
      if (!row) throw e;
  return { id: row.id, customerName: row.customerName, customerEmail: row.customerEmail, items: row.items||[], subtotal: row.subtotal||row.total, discount: (row as any).discount||0, deliveryCharges: row.deliveryCharges||0, total: row.total, status: row.status, paymentStatus: row.paymentStatus, createdAt: row.createdAt };
    }
  };

  const renderLabel = async (doc:any, o:any) => {
    const isA6 = labelFormat==='A6';
    const pagePadding = 24;
    const pageWidth = (isA6?298:595);
    const qrSize = isA6?48:80;
    const contentWidth = pageWidth - pagePadding*2;
    let y = pagePadding;
  // Header (logo removed per request)
  doc.setFont('helvetica','bold'); doc.setFontSize(isA6?14:20); doc.text('ORDER LABEL', pagePadding, y + (isA6?12:14));
  const metaY = y + (isA6?32:38);
    doc.setFont('helvetica','normal'); doc.setFontSize(isA6?8:9); doc.setTextColor(70);
    doc.text('Order ID: '+(o.id||o.orderId), pagePadding, metaY); 
    doc.text('Date: ' + (o.createdAt? new Date(o.createdAt).toLocaleString():''), pagePadding, metaY + (isA6?10:12));
    doc.setTextColor(0);
    // Customer rectangle + QR aligned side by side
    const topAfterMeta = metaY + (isA6?24:30);
    const rectTop = topAfterMeta;
    // QR first (right side)
    try { const { toDataURL } = await import('qrcode'); const qr = await toDataURL(o.id,{margin:0,scale:isA6?3:4}); doc.addImage(qr,'PNG', pageWidth - pagePadding - qrSize, rectTop, qrSize, qrSize); } catch {}
    const gapToQr = 12;
    const boxWidth = contentWidth - qrSize - gapToQr;
    // Consistent padding & aligned label/value columns
    const padX = 10; const padTop = isA6?14:18; const lineGap = isA6?10:13;
    let boxY = rectTop + padTop; // baseline for heading
    doc.setFont('helvetica','bold'); doc.setFontSize(isA6?11:13); doc.text('Customer', pagePadding+padX, boxY); 
    boxY += (isA6?14:18); // space after heading
    // Precompute label column width (max label width among fields)
  const fields = [
      ['Name', o.customerName || o.customerEmail || 'N/A'],
      ['Phone', o.customerPhone],
      ['Email', o.customerEmail],
      ['Address', [o.address,o.city,o.pincode].filter(Boolean).join(', ')]
  ].filter(f=>f[1]) as [string, any][];
    doc.setFont('helvetica','bold'); doc.setFontSize(isA6?8.5:10);
    const labelColWidth = Math.max(...fields.map(([lab])=>doc.getTextWidth(lab+':')))+6; // +gap
    const startX = pagePadding + padX;
    const valueStartX = startX + labelColWidth;
    const maxValueWidth = boxWidth - padX*2 - labelColWidth;
    for(const [lab,val] of fields){
      const labelText = lab+':';
      const valueStr = String(val||'');
      const wrapped = doc.splitTextToSize(valueStr, maxValueWidth);
      // First line with label bold
      doc.setFont('helvetica','bold'); doc.text(labelText, startX, boxY);
      doc.setFont('helvetica','normal'); doc.text(wrapped[0], valueStartX, boxY);
      for(let i=1;i<wrapped.length;i++){ boxY += lineGap; doc.text(wrapped[i], valueStartX, boxY); }
      boxY += lineGap; // gap after field
    }
    const rectHeight = (boxY - rectTop) + padX; // bottom padding
    doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(pagePadding, rectTop, boxWidth, rectHeight);
    y = rectTop + rectHeight + (isA6?14:22);
    // Items header
    const left = pagePadding;
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('Items', left, y); y+=6; doc.setLineWidth(0.4); doc.line(left, y, left+contentWidth, y); y+=8; doc.setFont('helvetica','bold'); doc.setFontSize(10);
  const col = { idx:left+2, name:left+28, qty:left + (isA6? 160:340), price:left + (isA6?210:420) };
    doc.text('#', col.idx, y);
    doc.text('Product', col.name, y);
    doc.text('Qty', col.qty, y,{align:'right'});
    doc.text('Price', col.price, y,{align:'right'});
    y+=6; doc.line(left, y, left+contentWidth, y); y+=4; doc.setFont('helvetica','normal');
    let alt=false;
  // Precompute total quantity for fallback price allocation
  const totalQty = (o.items||[]).reduce((s:number,it:any)=> s + (it.quantity||0),0) || 1;
  const effectiveSubtotal = (o.subtotal!=null? o.subtotal: o.total) || 0;
    for(let i=0;i<(o.items||[]).length;i++){
      let it = o.items[i]; it = await resolveProduct(it);
      // Extract variant from productId pattern id::variant if present
      let derivedFromId: string | undefined;
      if (!it.variantLabel && it.productId && String(it.productId).includes('::')) {
        const parts = String(it.productId).split('::');
        if (parts[1]) derivedFromId = parts[1];
      }
      let baseName = it.name || it.originalName || it.productName || `Item ${i+1}`;
      if (/^Product$/.test(baseName) && it.productId) {
        baseName = `Product ${String(it.productId).split('::')[0].slice(0,6)}`;
      }
      let vLabel = it.variantLabel || derivedFromId;
      if (!vLabel) {
        // Try to parse from existing name suffix
        const m = baseName.match(/\(([^)]+)\)$/);
        if (m) vLabel = m[1];
      }
      // Infer by comparing prices for same product id across items (if multiple variants of same product present)
      if (!vLabel) {
        const siblings = (o.items||[]).filter((s:any)=> String(s.productId) === String(it.productId));
        if (siblings.length > 1) {
          // Sort distinct prices ascending, map first->'30g', second->'60g' heuristic if labels absent
          const distinctPrices = Array.from(new Set(siblings.map((s:any)=> s.price).filter((p:any)=> p!=null))).sort((a:any,b:any)=>a-b);
          if (distinctPrices.length > 1) {
            const idx = distinctPrices.indexOf(it.price);
            if (idx === 0) vLabel = '30g'; else if (idx === 1) vLabel = '60g';
          }
        }
      }
      // Always use name(netWeight) if netWeight is available, fallback to productMap's netWeight
      let name = baseName;
      let netWeight = it.netWeight;
      // Try to get latest netWeight from productMap
      const map = await ensureProductMap();
      const prodEntry = map[it.productId] || map[it.id];
      if (!netWeight && prodEntry && prodEntry.netWeight) {
        netWeight = prodEntry.netWeight;
      }
      if (netWeight) {
        name = `${baseName}(${netWeight})`;
      } else if (vLabel) {
        const alreadyHas = /\([^()]*\)$/.test(baseName) && baseName.toLowerCase().includes(vLabel.toLowerCase());
        if (!alreadyHas) name = `${baseName} (${vLabel})`;
      }
      let price = (it.price!==undefined? it.price:0)||0;
      if (!price) {
        // Fallback: approximate from subtotal proportionally (uniform distribution)
        price = Math.round(effectiveSubtotal / totalQty);
      }
      const lineTotal = price*(it.quantity||0);
      const nameWrap = doc.splitTextToSize(name, (col.qty - col.name) - 8);
        const rowBaseIncrement = isA6?13:16;
        const rowHeight = Math.max(rowBaseIncrement, nameWrap.length*(isA6?10:12)) + 2;
      if(alt){ doc.setFillColor(246); doc.rect(left, y-2, contentWidth, rowHeight,'F'); }
        const textYOffset = (isA6?9:11);
        doc.text(String(i+1), col.idx, y+textYOffset);
        doc.text(nameWrap, col.name, y+textYOffset);
        doc.text(String(it.quantity||0), col.qty, y+textYOffset,{align:'right'});
        doc.text(price?`₹${price}`:'—', col.price, y+textYOffset,{align:'right'});
      y += rowHeight; alt=!alt;
      if (y > (isA6? 340: 740)) { doc.addPage(); y = pagePadding; }
    }
    // Totals / Status section
      y+= (isA6?4:10); doc.line(left, y, left+contentWidth, y); y+= (isA6?8:14); // extra gap before totals
  const put = (label:string,val:any,bold=false,color?:[number,number,number])=>{ if(color){ doc.setTextColor(...color);} else { doc.setTextColor(0);} doc.setFont('helvetica', bold?'bold':'normal'); doc.text(label, left+contentWidth-140, y); doc.text(String(val), left+contentWidth-10, y,{align:'right'}); y+=14; };
  // Totals rows (ensure discount always visible; reconstruct if absent)
  const rawSubtotal = o.subtotal ?? 0;
  const rawDelivery = o.deliveryCharges ?? 0;
  const rawTotal = o.total ?? 0;
  let discountVal: number = (o.discount!=null? o.discount: 0) || 0;
  const inferred = (rawSubtotal + rawDelivery) - rawTotal; // if positive, indicates discount
  if (inferred > 0 && (discountVal === 0 || Math.abs(inferred - discountVal) > 1)) {
    discountVal = inferred;
  }
  put('Subtotal', `₹${rawSubtotal}`);
  put('Delivery', `₹${rawDelivery}`);
  // Always show discount row (even if 0). Use green color only when >0.
  put('Discount', discountVal>0 ? `-₹${discountVal}` : '₹0');
    put('Total', `₹${rawTotal}`, true);
    doc.setFont('helvetica','normal');
    const statusLines = [`Status: ${o.status} (${o.paymentStatus})`];
    if (o.razorpayPaymentId) statusLines.push('Payment Ref: '+o.razorpayPaymentId);
    for(const l of statusLines){ doc.text(l, left, y); y+=12; }
    try { doc.setFontSize(8); doc.text(`*${o.id}*`, left, y+2); } catch {}
  };

  const downloadLabel = async (id:string) => {
    try {
      const detail = await fetchDetail(id);
      const Ctor = await getPdfCtor();
      const doc = new Ctor({ unit:'pt', format: labelFormat==='A6' ? [298,420] : 'a4' });
      await renderLabel(doc, detail);
      doc.save(`order-${detail.id}.pdf`);
    } catch (e:any) { console.error('[PDF ERROR]', e); alert('Failed to generate PDF: '+(e?.message||'Unknown')); }
  };

  const downloadBulk = async () => {
    if (!selected.length) return;
    try {
      const Ctor = await getPdfCtor();
      const doc = new Ctor({ unit:'pt', format: labelFormat==='A6' ? [298,420] : 'a4' });
      for (let i=0;i<selected.length;i++) {
        if (i>0) doc.addPage();
        const detail = await fetchDetail(selected[i]);
        await renderLabel(doc, detail);
      }
      doc.save(`orders-${selected.length}.pdf`);
    } catch (e:any) { console.error('[BULK PDF ERROR]', e); alert('Bulk PDF failed: '+(e?.message||'Unknown')); }
  };

  return (
    <AdminLayout>
      <div className='p-6 space-y-6'>
        <Card>
          <CardHeader className='space-y-4'>
            <div className='flex items-center justify-between'>
              <CardTitle>Orders</CardTitle>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
              <div>
                <label className='block text-xs mb-1 font-medium'>Status</label>
                <Select value={statusFilter} onValueChange={v=>{ setPage(1); setStatusFilter(v); }}>
                  <SelectTrigger><SelectValue placeholder='All status' /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All</SelectItem>
                    <SelectItem value='placed'>Placed</SelectItem>
                    <SelectItem value='shipped'>Shipped</SelectItem>
                    <SelectItem value='out_for_delivery'>Out for Delivery</SelectItem>
                    <SelectItem value='delivered'>Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-xs mb-1 font-medium'>Payment</label>
                <Select value={paymentFilter} onValueChange={v=>{ setPage(1); setPaymentFilter(v); }}>
                  <SelectTrigger><SelectValue placeholder='All payments' /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All</SelectItem>
                    <SelectItem value='paid'>Paid</SelectItem>
                    <SelectItem value='unpaid'>Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-xs mb-1 font-medium'>Start Date</label>
                <Input type='date' value={startDate} onChange={e=>{ setPage(1); setStartDate(e.target.value); }} />
              </div>
              <div>
                <label className='block text-xs mb-1 font-medium'>End Date</label>
                <Input type='date' value={endDate} onChange={e=>{ setPage(1); setEndDate(e.target.value); }} />
              </div>
              <div className='flex items-end gap-2'>
                <Button variant='outline' size='sm' onClick={()=>{ setStatusFilter('all'); setPaymentFilter('all'); setStartDate(''); setEndDate(''); setPage(1); }}>Reset</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <div>Loading...</div>}
            {error && <div className='text-red-500'>{(error as any).message}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><input type='checkbox' checked={allVisibleSelected} onChange={toggleSelectAll} /></TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Amount (₹)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.orders?.map(o => (
                  <TableRow key={o.id} className={selected.includes(o.id)?'bg-muted/50':''}>
                    <TableCell><input type='checkbox' checked={selected.includes(o.id)} onChange={()=>toggleSelect(o.id)} /></TableCell>
                    <TableCell className='font-mono text-xs'>{o.id.slice(-8)}</TableCell>
                    <TableCell>{o.customerName || o.customerEmail || '—'}</TableCell>
                    <TableCell>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={v=> updateStatus.mutate({ id:o.id, status:v })}>
                        <SelectTrigger className='w-[130px]'><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value='placed'>Placed</SelectItem>
                          <SelectItem value='shipped'>Shipped</SelectItem>
                          <SelectItem value='out_for_delivery'>Out for Delivery</SelectItem>
                          <SelectItem value='delivered'>Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant={o.paymentStatus==='paid' ? 'default':'outline'}>{o.paymentStatus}</Badge></TableCell>
                    <TableCell>{o.total}</TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        {['placed','shipped','out_for_delivery'].includes(o.status) && (
                          <Button size='sm' variant='outline' onClick={()=>{
                            const next:Record<string,string>={ placed:'shipped', shipped:'out_for_delivery', out_for_delivery:'delivered'};
                            updateStatus.mutate({ id:o.id, status: next[o.status] });
                          }}>{o.status==='placed'?'-> Shipped': o.status==='shipped'?'-> Out for Delivery':'-> Delivered'}</Button>
                        )}
                        {/* Cancel option removed per request */}
                        <Button size='sm' variant='secondary' onClick={()=>downloadLabel(o.id)}>PDF</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && !data?.orders?.length && (
                  <TableRow><TableCell colSpan={8} className='text-center text-sm text-muted-foreground'>No orders found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <div className='flex justify-between items-center mt-4 flex-wrap gap-4'>
              <div className='flex items-center gap-3 text-sm'>
                <span>Page {page} / {totalPages}</span>
                <span className='text-muted-foreground'>Selected: {selected.length}</span>
                <select className='border rounded px-1 py-0.5 text-xs' value={labelFormat} onChange={e=> setLabelFormat(e.target.value as any)}>
                  <option value='A4'>A4</option>
                  <option value='A6'>A6 (Thermal)</option>
                </select>
                <Button size='sm' variant='outline' disabled={!selected.length} onClick={downloadBulk}>Bulk PDF</Button>
                {!!selected.length && <Button size='sm' variant='ghost' onClick={()=>setSelected([])}>Clear</Button>}
              </div>
              <div className='space-x-2'>
                <Button size='sm' variant='outline' disabled={page<=1} onClick={()=>setPage((p:number)=>p-1)}>Prev</Button>
                <Button size='sm' variant='outline' disabled={page>=totalPages} onClick={()=>setPage((p:number)=>p+1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
