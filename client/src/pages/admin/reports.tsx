import { useState } from 'react';
import { AdminLayout } from '@/components/admin-nav';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

interface ReportData {
  monthlySales: { month: string; total: number; orders: number; }[];
  topProducts: { productId: string; name: string; totalQuantity: number; totalRevenue: number; }[];
  categorySales: { category: string; totalQuantity: number; totalRevenue: number; }[];
  range: { start: string; end: string };
}

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#ec4899','#10b981','#f43f5e','#14b8a6'];

export default function AdminReports() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { data, isLoading, error, refetch, isFetching } = useQuery<ReportData>({
    queryKey: ['admin-reports', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
  const res = await fetch(`/api/admin/reports/sales?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw new Error('Failed to load report');
      return res.json();
    },
  enabled: !!token
  });

  return (
    <AdminLayout>
    <div className='p-6 space-y-8'>
      <Card>
        <CardHeader className='space-y-4'>
          <CardTitle>Reports & Analytics</CardTitle>
          <div className='flex flex-wrap gap-4 items-end'>
            <div>
              <label className='block text-xs mb-1 font-medium'>Start Date</label>
              <Input type='date' value={startDate} onChange={e=>setStartDate(e.target.value)} />
            </div>
            <div>
              <label className='block text-xs mb-1 font-medium'>End Date</label>
              <Input type='date' value={endDate} onChange={e=>setEndDate(e.target.value)} />
            </div>
            <Button variant='outline' onClick={()=>refetch()} disabled={isFetching}>Apply</Button>
            <Button variant='ghost' onClick={()=>{ setStartDate(''); setEndDate(''); }}>Reset</Button>
          </div>
          {isLoading && <div className='text-sm'>Loading report...</div>}
          {error && <div className='text-sm text-red-500'>{(error as any).message}</div>}
        </CardHeader>
        <CardContent className='space-y-10'>
          {data && (
            <>
              <div className='grid lg:grid-cols-2 gap-10'>
                <Card className='col-span-1'>
                  <CardHeader><CardTitle className='text-base'>Top Selling Products (Qty)</CardTitle></CardHeader>
                  <CardContent style={{height:400}}>
                    {data.topProducts.length ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={data.topProducts} margin={{ left: 0, right: 10, top: 10, bottom: 10 }}>
                          <XAxis dataKey='name' hide={data.topProducts.length>12} interval={0} angle={-45} textAnchor='end' height={data.topProducts.length>12?0:80} />
                          <YAxis />
                          <ReTooltip />
                          <Bar dataKey='totalQuantity' fill='#6366f1' />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className='text-xs text-muted-foreground'>No product data in range.</div>}
                  </CardContent>
                </Card>
                <Card className='col-span-1'>
                  <CardHeader><CardTitle className='text-base'>Category Sales (Revenue)</CardTitle></CardHeader>
                  <CardContent style={{height:400}}>
                    {data.categorySales.length ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie dataKey='totalRevenue' nameKey='category' data={data.categorySales} outerRadius={140} label>
                            {data.categorySales.map((entry, index) => (
                              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className='text-xs text-muted-foreground'>No category data in range.</div>}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle className='text-base'>Monthly Revenue Growth</CardTitle></CardHeader>
                <CardContent style={{height:400}}>
                  {data.monthlySales.length ? (
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart data={data.monthlySales} margin={{ left: 0, right: 10, top: 10, bottom: 10 }}>
                        <XAxis dataKey='month' />
                        <YAxis />
                        <CartesianGrid strokeDasharray='3 3' />
                        <ReTooltip />
                        <Legend />
                        <Line type='monotone' dataKey='total' stroke='#0ea5e9' name='Revenue' />
                        <Line type='monotone' dataKey='orders' stroke='#6366f1' name='Orders' />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <div className='text-xs text-muted-foreground'>No monthly data in range.</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className='text-base'>Category Breakdown Table</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Revenue (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.categorySales.map(c => (
                        <TableRow key={c.category}>
                          <TableCell>{c.category}</TableCell>
                          <TableCell>{c.totalQuantity}</TableCell>
                          <TableCell>{c.totalRevenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
