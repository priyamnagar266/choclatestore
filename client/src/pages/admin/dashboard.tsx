import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from '@/components/admin-nav';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useAdminAuth } from '@/components/admin-auth';

interface RecentOrder { id: string; customerName?: string; customerEmail?: string; total: number; status: string; createdAt: string; itemsCount?: number; }
interface MetricsResponse { totalRevenue: number; totalOrders: number; totalProducts: number; totalUsers: number; pendingOrders: number; lowStockProducts: number; todayOrders: number; statusCounts: Record<string, number>; recentOrders: RecentOrder[]; }

export default function AdminDashboard() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const { data: metrics, isLoading, error, refetch } = useQuery<MetricsResponse>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
  const res = await fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load metrics');
      return res.json();
    },
  enabled: !!token,
    refetchInterval: 10000,
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button onClick={() => refetch()} className="text-sm px-3 py-2 border rounded">Refresh</button>
      </div>

      {isLoading && <div>Loading metrics...</div>}
      {error && <div className="text-red-500">{(error as any).message}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics?.totalRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Today: {metrics?.todayOrders || 0} orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">Placed: {metrics?.pendingOrders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Low stock: {metrics?.lowStockProducts || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">&nbsp;</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Order Status Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {metrics && Object.entries(metrics.statusCounts || {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 border rounded px-3 py-2 bg-muted/40">
                <span className="font-medium capitalize">{status}</span>
                <Badge>{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics?.recentOrders?.map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{o.customerName || o.customerEmail || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">₹{o.total}</span>
                  <Badge variant={o.status === 'placed' ? 'secondary' : 'default'}>{o.status.replace(/_/g,' ')}</Badge>
                </div>
              </div>
            ))}
            {!metrics?.recentOrders?.length && <div className="text-sm text-muted-foreground">No orders yet.</div>}
          </div>
        </CardContent>
      </Card>

  <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />Low Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{metrics?.lowStockProducts || 0} products running low</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Placed Orders</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{metrics?.pendingOrders || 0} newly placed</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </AdminLayout>
  );
}
