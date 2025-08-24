import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';

const links: { href: string; label: string }[] = [
  { href: "/admin/home", label: "Home" },
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
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
  return (
    <header className='fixed top-0 inset-x-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
      <div className='h-14 flex items-center px-4 gap-6'>
        <div className='font-bold text-sm tracking-wide'>Admin Panel</div>
        <nav className='flex-1 flex gap-1 overflow-x-auto text-sm'>
          {links.map(l => {
            const active = location === l.href;
            return (
              <Link key={l.href} href={l.href} className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${active ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-200'}`}>{l.label}</Link>
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
