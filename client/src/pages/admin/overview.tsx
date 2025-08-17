import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface OverviewData {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  pendingOrders: number;
  monthlySales: { month: string; total: number }[];
  paymentMethodDistribution: { method: string; value: number }[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#dc2626'];

export default function AdminOverview() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const { data, isLoading, error, refetch } = useQuery<OverviewData>({
    queryKey: ['admin-overview'],
    queryFn: async () => {
  const res = await fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load overview');
      return res.json();
    },
  enabled: !!token,
    refetchInterval: 60000
  });

  return (
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-3xl font-bold'>Overview</h1>
        <button onClick={()=>refetch()} className='px-3 py-2 text-sm border rounded'>Refresh</button>
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className='text-red-500'>{(error as any).message}</div>}
      {data && (
        <>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Total Sales</CardTitle>
                <DollarSign className='h-4 w-4 text-muted-foreground'/>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>₹{data.totalSales?.toLocaleString()}</div>
                <p className='text-xs text-muted-foreground'>Lifetime gross</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Orders</CardTitle>
                <ShoppingCart className='h-4 w-4 text-muted-foreground'/>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{data.totalOrders}</div>
                <p className='text-xs text-muted-foreground'>Placed: {data.pendingOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Customers</CardTitle>
                <Users className='h-4 w-4 text-muted-foreground'/>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{data.totalCustomers}</div>
                <p className='text-xs text-muted-foreground'>Unique emails</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Placed Orders</CardTitle>
                <Clock className='h-4 w-4 text-muted-foreground'/>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{data.pendingOrders}</div>
                <p className='text-xs text-muted-foreground'>Newly placed</p>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-6 lg:grid-cols-3'>
            <Card className='lg:col-span-2'>
              <CardHeader><CardTitle>Sales (Last 12 Months)</CardTitle></CardHeader>
              <CardContent>
                <div className='h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={data.monthlySales}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='month' tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type='monotone' dataKey='total' stroke='#2563eb' strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
              <CardContent>
                <div className='h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie dataKey='value' data={data.paymentMethodDistribution} outerRadius={90} label>
                        {data.paymentMethodDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className='flex flex-wrap gap-2 mt-2'>
                  {data.paymentMethodDistribution.map(p => (
                    <Badge key={p.method} variant='outline' className='flex items-center gap-1'>
                      <span className='w-2 h-2 rounded-full' style={{ background: COLORS[data.paymentMethodDistribution.findIndex(x=>x.method===p.method)%COLORS.length] }} />
                      {p.method}: {p.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
