
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem } from "@/lib/products";
import { useAuth } from "@/components/auth-context";

interface CartContextType {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (product: any) => void;
  openCart: () => void;
  closeCart: () => void;
  showCart: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const resolveCartKey = () => (user ? `cart_${user.id}` : 'cart_guest');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem(resolveCartKey());
      return savedCart ? JSON.parse(savedCart) : [];
    } catch { return []; }
  });
  const [showCart, setShowCart] = useState(false);

  // When user changes, load their cart
  useEffect(() => {
    try {
      const saved = localStorage.getItem(resolveCartKey());
      setCart(saved ? JSON.parse(saved) : []);
    } catch { setCart([]); }
    // eslint-disable-next-line
  }, [user]);

  // Save cart to correct key when cart or user changes
  useEffect(() => {
    try { localStorage.setItem(resolveCartKey(), JSON.stringify(cart)); } catch {}
    // eslint-disable-next-line
  }, [cart, user]);

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

  const openCart = () => setShowCart(true);
  const closeCart = () => setShowCart(false);

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, openCart, closeCart, showCart }}>
      {children}
    </CartContext.Provider>
  );
};
