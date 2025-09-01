import React, { createContext, useContext, useState, useEffect } from "react";

export type AuthUser = {
  // Support string or number ids (Mongo _id strings vs numeric ids)
  id: string | number;
  name: string;
  email: string;
  role: string;
  token: string;
};

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  ready: boolean; // indicates localStorage hydration complete
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Skip restoring admin into storefront context (admin persists separately)
          if (parsed && parsed.token && parsed.role !== 'admin') setUser(parsed);
        } catch {}
      }
    } finally { setReady(true); }
  }, []);

  function login(newUser: AuthUser) {
    // Only persist non-admin users for storefront context
    if (newUser.role !== 'admin') {
      setUser(newUser);
      localStorage.setItem("authUser", JSON.stringify(newUser));
    }
    // On user change, migrate anonymous cart (guest) to user-specific key if present
    try {
      let anonCart = localStorage.getItem('cart_guest');
      // Backward compatibility with older key name
      if (!anonCart) anonCart = localStorage.getItem('cart');
      if (anonCart) {
        if (newUser.role !== 'admin') localStorage.setItem(`cart_${newUser.id}`, anonCart);
        localStorage.removeItem('cart_guest');
        localStorage.removeItem('cart');
      }
    } catch {}
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("authUser");
  // Optionally keep cart per user; do not delete user-specific carts
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
