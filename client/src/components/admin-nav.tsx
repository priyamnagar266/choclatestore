import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';

interface LinkDef { href: string; label: string; kpiKey?: string }
const links: LinkDef[] = [
  { href: "/admin/home", label: "Home" },
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders', kpiKey: 'ordersTotal' },
  { href: '/admin/products', label: 'Products', kpiKey: 'productsTotal' },
  { href: '/admin/testimonials', label: 'Testimonials' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
];

export function AdminNav() {
  const { user, logout } = useAuth();
  const { adminUser, logoutAdmin } = useAdminAuth();
  const [location] = useLocation();
  const effectiveAdmin = adminUser || (user?.role === 'admin' ? user : null);
  // Lightweight metrics fetch (no react-query to keep nav lean)
  const [metrics, setMetrics] = React.useState<any>(null);
  React.useEffect(()=>{
    if (!effectiveAdmin?.token) return;
    let aborted = false;
    fetch('/api/admin/metrics', { headers:{ Authorization:`Bearer ${effectiveAdmin.token}` }}).then(r=>r.ok?r.json():null).then(d=>{ if(!aborted) setMetrics(d); }).catch(()=>{});
    const t = setInterval(()=>{
      fetch('/api/admin/metrics', { headers:{ Authorization:`Bearer ${effectiveAdmin.token}` }}).then(r=>r.ok?r.json():null).then(d=>{ if(!aborted) setMetrics(d); }).catch(()=>{});
    }, 120000); // refresh every 2 min
    return ()=>{ aborted = true; clearInterval(t); };
  }, [effectiveAdmin?.token]);
  return (
    <header className='fixed top-0 inset-x-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
      <div className='h-14 flex items-center px-4 gap-6'>
        <div className='font-bold text-sm tracking-wide'>Admin Panel</div>
        <nav className='flex-1 flex gap-1 overflow-x-auto text-sm items-stretch'>
          {links.map(l => {
            const active = location === l.href;
            const count = l.kpiKey && metrics ? metrics[l.kpiKey] : null;
            return (
              <Link key={l.href} href={l.href} className={`group relative px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${active ? 'bg-black text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'} `}>
                <span>{l.label}</span>
                {typeof count === 'number' && (
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${active ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-300'} leading-none`}>{count}</span>
                )}
                {active && <span className='absolute -bottom-px left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 rounded-full' />}
              </Link>
            );
          })}
        </nav>
        <div className='flex items-center gap-3 text-xs text-gray-600'>
          {effectiveAdmin && <span className='hidden sm:inline font-medium'>{effectiveAdmin.email}</span>}
          <button onClick={() => { logoutAdmin(); if (user?.role === 'admin') logout(); }} className='text-xs px-3 py-1 rounded bg-gray-900 text-white hover:bg-gray-700'>Logout</button>
        </div>
      </div>
    </header>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready: userReady } = useAuth();
  const { adminUser, ready: adminReady, setAdminUser } = useAdminAuth() as any;
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!userReady || !adminReady) return; // wait for hydration
    let effective = adminUser || (user && user.role === 'admin' ? user : null);
    // Fallback: try to rehydrate directly from localStorage if context empty (race condition safety)
    if (!effective) {
      try {
        const raw = localStorage.getItem('adminSession');
        if (raw) {
          const parsed = JSON.parse(raw);
            if (parsed?.role === 'admin' && parsed?.token) {
              setAdminUser?.(parsed);
              effective = parsed;
            }
        }
      } catch {}
    }
    if (!effective) {
      // Defer redirect slightly to allow any late setAdminUser from login page
      const t = setTimeout(() => setLocation('/admin/login'), 30);
      return () => clearTimeout(t);
    }
  }, [user, adminUser, userReady, adminReady, setLocation, setAdminUser]);

  if (!userReady || !adminReady) return null; // still hydrating
  if (!(adminUser || (user && user.role === 'admin'))) {
    return null; // guard until redirect executes
  }
  return (
    <div className='min-h-screen flex flex-col'>
      <AdminNav />
      <main className='flex-1 pt-14'>{children}</main>
    </div>
  );
}
