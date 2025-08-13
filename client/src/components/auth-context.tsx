import React, { createContext, useContext, useState, useEffect } from "react";

export type AuthUser = {
  // Mongo _id is a string; using string avoids accidental numeric coercion
  id: string;
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
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function login(newUser: AuthUser) {
    setUser(newUser);
    localStorage.setItem("authUser", JSON.stringify(newUser));
    try {
      // Load any existing user-specific cart and set as active cart
      const userCartKey = `cart_${newUser.id}`;
      const existing = localStorage.getItem(userCartKey);
      if (existing) {
        localStorage.setItem('cart', existing); // active session cart mirror
      } else {
        localStorage.setItem('cart', '[]');
      }
    } catch {}
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("authUser");
    try {
      // Clear active cart only (keep user-specific stored cart for future login)
      localStorage.removeItem('cart');
      // Also clear any pending transient order linked to previous session
      localStorage.removeItem('pendingOrder');
    } catch {}
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
