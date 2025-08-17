import React, { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin-nav';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { DollarSign, ShoppingCart, Package, Users, Clock, TrendingUp, BarChart2, Settings, ListChecks, LayoutDashboard } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface MetricsData { totalRevenue:number; totalOrders:number; todayOrders:number; statusCounts:Record<string,number>; totalProducts:number; totalUsers:number; lowStockProducts:number; pendingOrders:number; recentOrders:any[]; }
interface OverviewData { totalSales:number; totalOrders:number; totalCustomers:number; pendingOrders:number; monthlySales:{month:string; total:number}[]; }
interface ProductsData { products: { id:number; name:string; category:string; price:number; inStock:number; image:string; }[]; total:number; }
interface ReportsData { monthlySales:{ month:string; total:number; orders:number }[]; topProducts:{ productId:string; name:string; totalQuantity:number; totalRevenue:number }[]; }

export default function AdminHome() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);

  const { data: metrics } = useQuery<MetricsData>({
    queryKey:['home-metrics'],
    queryFn: async ()=> { const r= await fetch('/api/admin/metrics',{ headers:{ Authorization:`Bearer ${token}` }}); if(!r.ok) throw new Error('metrics'); return r.json(); },
    enabled: !!token,
    staleTime: 10_000
  });
  const { data: overview } = useQuery<OverviewData>({
    queryKey:['home-overview'],
    queryFn: async ()=> { const r= await fetch('/api/admin/overview',{ headers:{ Authorization:`Bearer ${token}` }}); if(!r.ok) throw new Error('overview'); return r.json(); },
    enabled: !!token,
    staleTime: 60_000
  });
  const { data: products } = useQuery<ProductsData>({
    queryKey:['home-products'],
    queryFn: async ()=> { const r= await fetch('/api/admin/products?page=1&pageSize=5',{ headers:{ Authorization:`Bearer ${token}` }}); if(!r.ok) throw new Error('products'); return r.json(); },
    enabled: !!token,
    staleTime: 15_000
  });
  // Sales trend filters
  const [rangePreset, setRangePreset] = useState<'3m'|'6m'|'12m'|'custom'>('6m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [groupBy, setGroupBy] = useState<'month'|'week'|'day'>('month');

  const { startDate, endDate } = useMemo(()=>{
    if (rangePreset === 'custom' && customStart && customEnd) return { startDate: customStart, endDate: customEnd };
    const now = new Date();
    const endStr = now.toISOString().slice(0,10);
    const d = new Date(now);
    if (rangePreset === '3m') d.setMonth(d.getMonth()-2,1);
    else if (rangePreset === '6m') d.setMonth(d.getMonth()-5,1);
    else if (rangePreset === '12m') d.setMonth(d.getMonth()-11,1);
    const startStr = d.toISOString().slice(0,10);
    return { startDate: startStr, endDate: endStr };
  }, [rangePreset, customStart, customEnd]);

  const { data: reports } = useQuery<ReportsData>({
    queryKey:['home-reports', startDate, endDate],
    queryFn: async ()=> { const r= await fetch(`/api/admin/reports/sales?${new URLSearchParams({ startDate, endDate })}`,{ headers:{ Authorization:`Bearer ${token}` }}); if(!r.ok) throw new Error('reports'); return r.json(); },
    enabled: !!token && !!startDate && !!endDate,
    staleTime: 120_000
  });

  const trendData = useMemo(()=>{
    const base = reports?.monthlySales || overview?.monthlySales || [];
    if (groupBy === 'month') return base;
    if (!base.length) return [];
    if (groupBy === 'week') {
      const weeks: any[] = [];
      base.forEach((m: any)=>{
        const avg = (m.total||0)/4;
        for (let i=1;i<=4;i++) weeks.push({ month: `${m.month}-W${i}`, total: avg });
      });
      return weeks;
    }
    if (groupBy === 'day') {
      const days: any[] = [];
      base.forEach((m: any)=>{
        const avg = (m.total||0)/30;
        for (let i=1;i<=30;i+=5) days.push({ month: `${m.month}-${String(i).padStart(2,'0')}`, total: avg*5 });
      });
      return days;
    }
    return base;
  }, [reports, overview, groupBy]);

  return (
    <AdminLayout>
      <div className='p-6 space-y-8'>
        <div className='flex flex-wrap justify-between gap-4 items-center'>
          <h1 className='text-3xl font-bold'>Admin Home</h1>
          <div className='flex gap-2 flex-wrap text-xs'>
            <QuickLink to='/admin/dashboard' icon={<LayoutDashboard className='h-3.5 w-3.5'/>} label='Dashboard' />
            <QuickLink to='/admin/overview' icon={<TrendingUp className='h-3.5 w-3.5'/>} label='Overview' />
            <QuickLink to='/admin/reports' icon={<BarChart2 className='h-3.5 w-3.5'/>} label='Reports' />
            <QuickLink to='/admin/orders' icon={<ListChecks className='h-3.5 w-3.5'/>} label='Orders' />
            <QuickLink to='/admin/products' icon={<Package className='h-3.5 w-3.5'/>} label='Products' />
            <QuickLink to='/admin/customers' icon={<Users className='h-3.5 w-3.5'/>} label='Customers' />
            <QuickLink to='/admin/settings' icon={<Settings className='h-3.5 w-3.5'/>} label='Settings' />
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <KpiCard icon={DollarSign} label='Revenue' value={`₹${metrics?.totalRevenue?.toLocaleString()||0}`} sub={`Today ${metrics?.todayOrders||0} orders`} />
          <KpiCard icon={ShoppingCart} label='Orders' value={metrics?.totalOrders||overview?.totalOrders||0} sub={`Placed ${metrics?.pendingOrders||overview?.pendingOrders||0}`} />
          <KpiCard icon={Package} label='Products' value={metrics?.totalProducts||0} sub={`Low stock ${metrics?.lowStockProducts||0}`} />
          <KpiCard icon={Users} label='Customers' value={overview?.totalCustomers||metrics?.totalUsers||0} sub='Unique buyers' />
        </div>

        <div className='grid gap-6 lg:grid-cols-3'>
          <Card className='lg:col-span-2'>
            <CardHeader>
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <CardTitle>Sales Trend</CardTitle>
                <div className='flex flex-wrap gap-2 items-center text-xs'>
                  <select value={rangePreset} onChange={e=>setRangePreset(e.target.value as any)} className='border px-2 py-1 rounded'>
                    <option value='3m'>Last 3m</option>
                    <option value='6m'>Last 6m</option>
                    <option value='12m'>Last 12m</option>
                    <option value='custom'>Custom</option>
                  </select>
                  {rangePreset === 'custom' && (
                    <>
                      <input type='date' value={customStart} onChange={e=>setCustomStart(e.target.value)} className='border px-2 py-1 rounded' />
                      <span>-</span>
                      <input type='date' value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className='border px-2 py-1 rounded' />
                    </>
                  )}
                  <select value={groupBy} onChange={e=>setGroupBy(e.target.value as any)} className='border px-2 py-1 rounded'>
                    <option value='month'>By Month</option>
                    <option value='week'>Approx Weeks</option>
                    <option value='day'>Approx Days</option>
                  </select>
                  <div className='px-2 py-1 rounded bg-gray-100'>{startDate} → {endDate}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='month' hide={false} tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip />
                    <Line type='monotone' dataKey='total' stroke='#2563eb' strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className='flex flex-wrap gap-2'>
                {metrics && Object.entries(metrics.statusCounts||{}).map(([s,c])=> (
                  <div key={s} className='px-3 py-2 text-xs rounded border flex items-center gap-2'>
                    <span className='capitalize'>{s}</span>
                    <Badge>{c}</Badge>
                  </div>
                ))}
                {!metrics && <div className='text-xs text-muted-foreground'>Loading...</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-6 lg:grid-cols-3'>
          <Card className='lg:col-span-2'>
            <CardHeader className='flex justify-between items-center'>
              <CardTitle>Recent Orders</CardTitle>
              <Link href='/admin/orders' className='text-xs underline'>View all</Link>
            </CardHeader>
            <CardContent>
              <div className='divide-y border rounded'>
                {(metrics?.recentOrders||[]).slice(0,8).map(o => (
                  <div key={o.id} className='flex text-sm justify-between px-3 py-2 items-center'>
                    <div className='flex flex-col'>
                      <span className='font-medium'>{o.customerName||o.customerEmail||'Unknown'}</span>
                      <span className='text-xs text-gray-500'>{new Date(o.createdAt).toLocaleString()}</span>
                    </div>
                    <div className='flex items-center gap-4'>
                      <span className='font-semibold'>₹{o.total}</span>
                      <Badge variant={o.status==='placed'? 'secondary' : 'outline'}>{o.status.replace(/_/g,' ')}</Badge>
                    </div>
                  </div>
                ))}
                {!metrics?.recentOrders?.length && <div className='text-xs p-3 text-muted-foreground'>No orders yet.</div>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex justify-between items-center'>
              <CardTitle>Top Products</CardTitle>
              <Link href='/admin/products' className='text-xs underline'>Manage</Link>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {(reports?.topProducts||[]).slice(0,5).map(p=>(
                  <div key={p.productId} className='flex justify-between text-sm'>
                    <span className='truncate max-w-[160px]' title={p.name}>{p.name||'Product '+p.productId}</span>
                    <span className='font-medium'>₹{p.totalRevenue.toFixed(0)}</span>
                  </div>
                ))}
                {!reports?.topProducts?.length && <div className='text-xs text-muted-foreground'>No data.</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className='flex justify-between items-center'>
            <CardTitle>Inventory Snapshot</CardTitle>
            <Link href='/admin/products' className='text-xs underline'>All products</Link>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='text-left bg-muted/40'>
                    <th className='px-3 py-2'>ID</th>
                    <th className='px-3 py-2'>Name</th>
                    <th className='px-3 py-2'>Category</th>
                    <th className='px-3 py-2'>Price</th>
                    <th className='px-3 py-2'>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(products?.products||[]).slice(0,5).map(p => (
                    <tr key={p.id} className='border-t'>
                      <td className='px-3 py-1 font-mono text-xs'>{p.id}</td>
                      <td className='px-3 py-1'>{p.name}</td>
                      <td className='px-3 py-1'>{p.category}</td>
                      <td className='px-3 py-1'>₹{p.price}</td>
                      <td className='px-3 py-1'>{p.inStock}</td>
                    </tr>
                  ))}
                  {!products?.products?.length && (
                    <tr><td colSpan={5} className='px-3 py-2 text-xs text-muted-foreground'>No products.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function KpiCard({ icon:Icon, label, value, sub }: { icon: any; label:string; value:any; sub?:string }) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{label}</CardTitle>
        <Icon className='h-4 w-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {sub && <p className='text-xs text-muted-foreground'>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function QuickLink({ to, label, icon }: { to:string; label:string; icon:React.ReactNode }) {
  return (
    <Link href={to} className='flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded'>
      {icon}<span>{label}</span>
    </Link>
  );
}
