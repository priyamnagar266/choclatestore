import { useState } from 'react';
import { AdminLayout } from '@/components/admin-nav';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  ordersCount: number;
  totalSpend: number;
  role?: string;
}

interface ResponseData { customers: CustomerRow[]; total: number; page: number; pageSize: number; }

export default function AdminCustomers() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data, isLoading, error } = useQuery<ResponseData>({
    queryKey: ['admin-customers', page, search, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
  const res = await fetch(`/api/admin/customers?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw new Error('Failed to load customers');
      return res.json();
    },
  enabled: !!token
  });

  const rows = (data?.customers || []).filter(c => roleFilter === 'all' || c.role === roleFilter);
  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <AdminLayout>
    <div className='p-6 space-y-6'>
      <Card>
        <CardHeader className='space-y-4'>
          <CardTitle>Customers</CardTitle>
          <div className='grid gap-4 md:grid-cols-5'>
            <div className='md:col-span-2'>
              <label className='block text-xs mb-1 font-medium'>Search (name/email)</label>
              <Input value={search} onChange={e=>{ setPage(1); setSearch(e.target.value); }} placeholder='Search...' />
            </div>
            <div>
              <label className='block text-xs mb-1 font-medium'>Start Date</label>
              <Input type='date' value={startDate} onChange={e=>{ setPage(1); setStartDate(e.target.value); }} />
            </div>
            <div>
              <label className='block text-xs mb-1 font-medium'>End Date</label>
              <Input type='date' value={endDate} onChange={e=>{ setPage(1); setEndDate(e.target.value); }} />
            </div>
            <div>
              <label className='block text-xs mb-1 font-medium'>Role</label>
              <Select value={roleFilter} onValueChange={v=>setRoleFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All</SelectItem>
                  <SelectItem value='user'>Users</SelectItem>
                  <SelectItem value='admin'>Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='flex gap-2 text-xs'>
            <Button size='sm' variant='outline' onClick={()=>{ setSearch(''); setStartDate(''); setEndDate(''); setRoleFilter('all'); setPage(1); }}>Reset</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <div>Loading...</div>}
          {error && <div className='text-red-500 text-sm'>{(error as any).message}</div>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spend (₹)</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.name || '—'}</TableCell>
                  <TableCell className='font-mono text-xs'>{c.email}</TableCell>
                  <TableCell>{c.ordersCount}</TableCell>
                  <TableCell>{c.totalSpend?.toFixed(2)}</TableCell>
                  <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell><Badge variant={c.role === 'admin' ? 'default' : 'outline'}>{c.role || 'user'}</Badge></TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className='text-center text-sm text-muted-foreground'>No customers found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <div className='flex justify-between items-center mt-4'>
            <div className='text-sm'>Page {page} / {totalPages}</div>
            <div className='space-x-2'>
              <Button size='sm' variant='outline' disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
              <Button size='sm' variant='outline' disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
