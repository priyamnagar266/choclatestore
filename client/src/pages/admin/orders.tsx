import { useState } from 'react';
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

interface OrderRow {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
  items: { productId: string; quantity: number }[];
}

const statusColors: Record<string,string> = {
  pending: 'secondary',
  processing: 'outline',
  completed: 'default',
  cancelled: 'destructive'
};

export default function AdminOrders() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading, error } = useQuery<{ orders: OrderRow[]; total: number; page: number; pageSize: number }>({
    queryKey: ['admin-orders', page, statusFilter, paymentFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
  const res = await fetch(`/api/admin/orders?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw new Error('Failed to load orders');
      return res.json();
    },
  enabled: !!token
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
  const res = await fetch(`/api/admin/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    }
  });

  const totalPages = data ? Math.ceil((data.total || 0) / pageSize) : 1;

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
              <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
                <SelectTrigger><SelectValue placeholder='All status' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='processing'>Processing</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                  <SelectItem value='cancelled'>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className='block text-xs mb-1 font-medium'>Payment</label>
              <Select value={paymentFilter} onValueChange={(v) => { setPage(1); setPaymentFilter(v); }}>
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
              <Input type='date' value={startDate} onChange={e => { setPage(1); setStartDate(e.target.value); }} />
            </div>
            <div>
              <label className='block text-xs mb-1 font-medium'>End Date</label>
              <Input type='date' value={endDate} onChange={e => { setPage(1); setEndDate(e.target.value); }} />
            </div>
            <div className='flex items-end'>
              <Button variant='outline' size='sm' onClick={() => { setStatusFilter('all'); setPaymentFilter('all'); setStartDate(''); setEndDate(''); setPage(1); }}>Reset</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <div>Loading...</div>}
          {error && <div className='text-red-500'>{(error as any).message}</div>}
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={o.id}>
                  <TableCell className='font-mono text-xs'>{o.id.slice(-8)}</TableCell>
                  <TableCell>{o.customerName || o.customerEmail || '—'}</TableCell>
                  <TableCell>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className='w-[130px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='pending'>Pending</SelectItem>
                        <SelectItem value='processing'>Processing</SelectItem>
                        <SelectItem value='completed'>Completed</SelectItem>
                        <SelectItem value='cancelled'>Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.paymentStatus === 'paid' ? 'default' : 'outline'}>{o.paymentStatus}</Badge>
                  </TableCell>
                  <TableCell>{o.total}</TableCell>
                  <TableCell>
                    <div className='flex gap-2'>
                      {['pending','processing'].includes(o.status) && (
                        <Button size='sm' variant='outline' onClick={() => updateStatus.mutate({ id: o.id, status: o.status === 'pending' ? 'processing' : 'completed' })}>
                          {o.status === 'pending' ? '-> Processing' : '-> Completed'}
                        </Button>
                      )}
                      {o.status !== 'cancelled' && o.status !== 'completed' && (
                        <Button size='sm' variant='destructive' onClick={() => updateStatus.mutate({ id: o.id, status: 'cancelled' })}>Cancel</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !data?.orders?.length && (
                <TableRow><TableCell colSpan={7} className='text-center text-sm text-muted-foreground'>No orders found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <div className='flex justify-between items-center mt-4'>
            <div className='text-sm'>Page {page} / {totalPages}</div>
            <div className='space-x-2'>
              <Button size='sm' variant='outline' disabled={page<=1} onClick={() => setPage(p=>p-1)}>Prev</Button>
              <Button size='sm' variant='outline' disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
