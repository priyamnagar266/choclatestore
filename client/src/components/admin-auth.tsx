import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AdminUser {
  id: string;
  name?: string;
  email: string;
  role: string; // should be 'admin'
  token: string;
}

interface AdminAuthCtx {
  adminUser: AdminUser | null;
  setAdminUser: (u: AdminUser | null) => void;
  logoutAdmin: () => void;
  ready: boolean; // hydration complete
}

const AdminAuthContext = createContext<AdminAuthCtx | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUserState] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminSession');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.role === 'admin') setAdminUserState(parsed);
      }
    } finally { setReady(true); }
  }, []);

  function setAdminUser(u: AdminUser | null) {
    setAdminUserState(u);
    if (u) {
      localStorage.setItem('adminSession', JSON.stringify(u));
    } else {
      localStorage.removeItem('adminSession');
    }
  }

  function logoutAdmin() { setAdminUser(null); }

  return (
    <AdminAuthContext.Provider value={{ adminUser, setAdminUser, logoutAdmin, ready }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
