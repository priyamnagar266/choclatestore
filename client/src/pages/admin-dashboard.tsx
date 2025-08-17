import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { useLocation } from 'wouter';
import { AdminLayout } from '@/components/admin-nav';

interface Metrics {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  statusCounts: Record<string, number>;
  totalProducts?: number;
  totalUsers?: number;
  lowStockProducts?: number;
  pendingOrders?: number;
  recentOrders: Array<{ id: string; customerName: string; total: number; status: string; createdAt: string; itemsCount: number; }>;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const [_, navigate] = useLocation();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  if (!token) return;
  if (!(adminUser || (user && user.role === 'admin'))) {
      setError('Not authorized');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
  const res = await fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data.message || `Failed to load metrics (status ${res.status})`;
          // If token invalid / expired -> force logout + redirect
            if (res.status === 401 || res.status === 403) {
              setError(msg);
              setMetrics(null); // clear stale metrics
              setTimeout(() => { logout(); navigate('/admin/login'); }, 1500);
            } else {
              setError(msg);
            }
          return;
        }
        if (!cancelled) {
          setMetrics(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Network error');
          setMetrics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, user, adminUser, logout, navigate]);

  if (!token) return <AdminLayout><div className='p-8'>Please login as admin.</div></AdminLayout>;

  return (
    <AdminLayout>
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Admin Dashboard</h1>
      </div>
      {loading && <div>Loading metrics...</div>}
  {error && <div className='text-red-600'>{error}</div>}
      {metrics && (
        <>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <StatCard label='Total Orders' value={metrics.totalOrders} />
            <StatCard label='Revenue' value={'₹' + metrics.totalRevenue.toFixed(2)} />
            <StatCard label="Today's Orders" value={metrics.todayOrders} />
            <StatCard label='Placed' value={metrics.statusCounts?.placed || 0} />
          </div>
          <div>
            <h2 className='text-lg font-semibold mt-4 mb-2'>Recent Orders</h2>
            <div className='overflow-x-auto border rounded'>
              <table className='min-w-full text-sm'>
                <thead className='bg-gray-100'>
                  <tr>
                    <th className='px-3 py-2 text-left'>Order ID</th>
                    <th className='px-3 py-2 text-left'>Customer</th>
                    <th className='px-3 py-2 text-left'>Total (₹)</th>
                    <th className='px-3 py-2 text-left'>Status</th>
                    <th className='px-3 py-2 text-left'>Items</th>
                    <th className='px-3 py-2 text-left'>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentOrders.map(o => (
                    <tr key={o.id} className='border-t'>
                      <td className='px-3 py-1'>{o.id}</td>
                      <td className='px-3 py-1'>{o.customerName}</td>
                      <td className='px-3 py-1'>{o.total}</td>
                      <td className='px-3 py-1'>{o.status}</td>
                      <td className='px-3 py-1'>{o.itemsCount}</td>
                      <td className='px-3 py-1'>{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {metrics.recentOrders.length === 0 && (
                    <tr><td colSpan={6} className='px-3 py-2 text-center text-gray-500'>No recent orders</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
  </div>
  </AdminLayout>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div className='bg-white rounded shadow p-4'>
      <div className='text-xs uppercase text-gray-500'>{label}</div>
      <div className='text-xl font-semibold'>{value}</div>
    </div>
  );
}
