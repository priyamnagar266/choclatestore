import React, { createContext, useContext, useState, useEffect } from "react";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  token: string;
};

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
    // Previously skipped admin users; now always restore so admin accounts stay logged in across refresh.
    if (parsed && parsed.token) setUser(parsed);
      } catch {}
    }
  }, []);

  function login(newUser: AuthUser) {
  // Persist any user (including admin) so refresh keeps session
  setUser(newUser);
  localStorage.setItem("authUser", JSON.stringify(newUser));
    // On user change, migrate anonymous cart to user-specific key if present
    try {
      const anonCart = localStorage.getItem('cart');
      if (anonCart) {
        if (newUser.role !== 'admin') localStorage.setItem(`cart_${newUser.id}`, anonCart);
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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
