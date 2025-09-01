
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem } from "@/lib/products";
import { useAuth } from "@/components/auth-context";

interface CartContextType {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (product: any) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  showCart: boolean;
  promoCode: string;
  promoMessage: string;
  discount: number;
  freeShipping: boolean;
  applyPromo: (code: string) => void;
  clearPromo: () => void;
  promoToast: { type: 'success'|'error', message: string } | null;
  setPromoToast: React.Dispatch<React.SetStateAction<{ type: 'success'|'error', message: string } | null>>;
  ready: boolean; // cart hydration ready (after auth ready)
}
import { evaluatePromo, PromoResult, KNOWN_PROMOS } from '@/lib/promos';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, ready: authReady } = useAuth();
  const resolveCartKey = () => (user ? `cart_${user.id}` : 'cart_guest');
  // Start empty; hydrate after auth ready to avoid reading guest key then switching user
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [showCart, setShowCart] = useState(false);
  // Persist promo code in localStorage
  const promoKey = 'cartPromoCode';
  const [promoCode, setPromoCode] = useState<string>(() => {
    try { return localStorage.getItem(promoKey) || ''; } catch { return ''; }
  });
  const [promoMessage, setPromoMessage] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [freeShipping, setFreeShipping] = useState<boolean>(false);

  // Hydrate when auth ready or user changes
  useEffect(() => {
    if (!authReady) return; // wait for auth to finish hydration
    try {
      const saved = localStorage.getItem(resolveCartKey());
      setCart(saved ? JSON.parse(saved) : []);
    } catch { setCart([]); }
    setReady(true);
    // eslint-disable-next-line
  }, [user, authReady]);

  // Persist cart only after hydration ready
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(resolveCartKey(), JSON.stringify(cart)); } catch {}
    // eslint-disable-next-line
  }, [cart, user, ready]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      let updatedCart;
      if (existingItem) {
        updatedCart = prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedCart = [...prev, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        }];
      }
      return updatedCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    try {
      const key = resolveCartKey();
      localStorage.removeItem(key);
      // Also remove legacy keys to avoid resurrection
      localStorage.removeItem('cart_guest');
      localStorage.removeItem('cart'); // legacy
    } catch {}
  };

  const openCart = () => setShowCart(true);
  const closeCart = () => setShowCart(false);

  // Toast feedback (optional, can be used in UI)
  const [promoToast, setPromoToast] = useState<{ type: 'success'|'error', message: string }|null>(null);

  const applyPromo = (code: string) => {
    const result: PromoResult = evaluatePromo(code, cart);
    setPromoCode(result.code);
    setPromoMessage(result.message);
    setDiscount(result.valid ? result.discount : 0);
    setFreeShipping(!!result.freeShipping);
    try { localStorage.setItem(promoKey, result.code); } catch {}
    setPromoToast(result.valid ? { type: 'success', message: result.message } : { type: 'error', message: result.message });
  };
  const clearPromo = () => {
    setPromoCode('');
    setPromoMessage('');
    setDiscount(0);
    setFreeShipping(false);
    try { localStorage.removeItem(promoKey); } catch {}
    setPromoToast(null);
  };

  // Auto-suggest promo from product promoMessage if present and no promo applied
  useEffect(() => {
    if (promoCode) return;
    // Find first product with a recognizable promoMessage
    const promoFromProduct = cart.find(item => {
      // Try to match known promo codes in promoMessage
      const prod = item as any;
      if (!prod.promoMessage) return false;
      return Object.keys(KNOWN_PROMOS).some(k => prod.promoMessage.toUpperCase().includes(k));
    });
    if (promoFromProduct) {
      const prod = promoFromProduct as any;
      const found = Object.keys(KNOWN_PROMOS).find(k => prod.promoMessage.toUpperCase().includes(k));
      if (found) {
        setPromoMessage(`Tip: Use code ${found} for this offer!`);
      }
    }
  }, [cart, promoCode]);

  // Clear promo if cart is emptied
  useEffect(() => {
    if (cart.length === 0 && promoCode) clearPromo();
  }, [cart]);

  // Re-validate promo if cart changes (e.g. quantity change)
  useEffect(() => {
    if (promoCode) applyPromo(promoCode);
    // eslint-disable-next-line
  }, [cart.length, cart.map(i=>i.id+':'+i.quantity).join(',')]);

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, clearCart, openCart, closeCart, showCart, promoCode, promoMessage, discount, freeShipping, applyPromo, clearPromo, promoToast, setPromoToast, ready }}>
      {children}
    </CartContext.Provider>
  );
};
