import * as React from "react";
const { createContext, useContext } = React;

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
  // Defensive: if React namespace failed to load (edge bundler issue), short-circuit to avoid hard crash
  if (!(React as any)?.useState) {
    console.error('[AuthProvider] React hooks unavailable');
    return children as any;
  }
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
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

  return <AuthContext.Provider value={{ user, login, logout, ready }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
