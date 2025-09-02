
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
      // Stable product identity across data sources
      const productKey = product.id ?? product._id ?? product.slug ?? (product.name || 'unknown');
      // Robust variant resolution (explicit selection first)
      let variantLabel: string | null = null;
      try {
        const normalize = (s: any) => typeof s === 'string' ? s.trim().toLowerCase() : '';
        // 1. Direct explicit field
        if (product.variantLabel) variantLabel = product.variantLabel;
        // 2. tempSelectedVariant object
        if (!variantLabel && product.tempSelectedVariant?.label) variantLabel = product.tempSelectedVariant.label;
        // 3. selectedVariantLabel even if variants array missing
        if (!variantLabel && product.selectedVariantLabel) variantLabel = product.selectedVariantLabel;
        // 4. Attempt tolerant lookup inside variants (case / whitespace insensitive)
        if (!variantLabel && product.selectedVariantLabel && Array.isArray(product.variants)) {
          const target = normalize(product.selectedVariantLabel);
          const found = product.variants.find((v: any)=> normalize(v.label) === target);
          if (found?.label) variantLabel = found.label;
        }
      } catch { /* ignore */ }
      if (!variantLabel) {
        // fallback to legacy props if any
        variantLabel = product.tempSelectedVariant?.label || product.selectedVariantLabel || null;
      }
      // SAFEGUARD: if product has variants but caller didn't attach a label, auto-pick preferred (30g else first)
      if (!variantLabel && Array.isArray(product.variants) && product.variants.length > 0) {
        const preferred = product.variants.find((v: any) => (v.label || '').toLowerCase() === '30g') || product.variants[0];
        if (preferred?.label) variantLabel = preferred.label;
      }
      // SECONDARY SAFEGUARD: if product object itself has no variants but a global enriched list does, try to enrich
      if (!variantLabel && (!Array.isArray(product.variants) || product.variants.length === 0)) {
        try {
          const globalList: any[] | undefined = (window as any).__ALL_PRODUCTS;
          if (Array.isArray(globalList)) {
            const match = globalList.find(p => (p.id || p._id || p.slug) === (product.id || product._id || product.slug));
            if (match && Array.isArray((match as any).variants) && (match as any).variants.length) {
              const vars: any[] = (match as any).variants;
              const pref = vars.find(v => (v.label || '').toLowerCase() === '30g') || vars[0];
              if (pref?.label) {
                variantLabel = pref.label;
                // Merge variants onto product so price logic below can use them
                product = { ...product, variants: vars };
              }
            }
          }
        } catch {}
      }
      const itemKey = variantLabel ? `${productKey}::${variantLabel}` : String(productKey);
      try {
        console.info('[CART:add] productKey', productKey, 'variantLabel', variantLabel, 'itemKey', itemKey, {
          selectedVariantLabel: product.selectedVariantLabel,
          explicitVariantLabelField: product.variantLabel,
            tempSelectedVariant: product.tempSelectedVariant ? { l: product.tempSelectedVariant.label, p: product.tempSelectedVariant.price, s: product.tempSelectedVariant.salePrice } : null,
          variantsSnapshot: Array.isArray(product.variants) ? product.variants.map((v:any)=>({ l:v.label, p:v.price, s:v.salePrice })) : 'no-array'
        });
        if (!variantLabel && (product.selectedVariantLabel || product.tempSelectedVariant)) {
          console.warn('[CART:add WARN] Expected variant label but resolution failed. Falling back to base product.');
        }
      } catch {}
      const keyMatch = (item: any) => item.id === itemKey;
      const existingItem = prev.find(keyMatch);
      if (existingItem) return prev.map(item => keyMatch(item) ? { ...item, quantity: item.quantity + 1 } : item);
      // Compute effective price from variant if any
  // Start with precomputed variant price if provided
  let price = (variantLabel && product.effectiveVariantPrice!=null) ? product.effectiveVariantPrice : (product.salePrice != null && product.salePrice < product.price) ? product.salePrice : product.price;
      if (variantLabel) {
        if (Array.isArray(product.variants)) {
          const v = product.variants.find((v: any)=> v.label === variantLabel);
          if (v) price = (v.salePrice != null && v.salePrice < v.price) ? v.salePrice : v.price;
        } else if (product.tempSelectedVariant && product.tempSelectedVariant.label === variantLabel) {
          const v = product.tempSelectedVariant;
            price = (v.salePrice != null && v.salePrice < v.price) ? v.salePrice : v.price;
        }
      }
      return [...prev, {
        id: itemKey,
        baseProductId: productKey,
        name: product.name + (variantLabel ? ` (${variantLabel})` : ''),
        price,
        quantity: 1,
        image: product.image,
        variantLabel: variantLabel || undefined,
      } as any];
    });
    // Defer logging until after state update
    setTimeout(()=>{
      try {
        const key = product.id ?? product._id ?? product.slug ?? (product.name || 'unknown');
        const storageKey = resolveCartKey();
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : null;
        console.info('[CART:post-add] storageSnapshot', { storageKey, parsed });
      } catch {}
    },0);
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
