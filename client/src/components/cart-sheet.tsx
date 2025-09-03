// import React from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Truck } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { KNOWN_PROMOS } from '@/lib/promos';
import { useAuth } from "@/components/auth-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { calculateCartTotal, calculateItemCount, formatPrice } from "@/lib/products";

const CartSheet: React.FC = () => {
  const { cart, setCart, clearCart, closeCart, promoCode, promoMessage, discount, freeShipping, applyPromo, clearPromo, promoToast, setPromoToast } = useCart();
  // Dropdown state for promo selection
  const [selectedPromo, setSelectedPromo] = useState<string>(promoCode || '');
  // Keep dropdown in sync with applied promo
  useEffect(() => { setSelectedPromo(promoCode || ''); }, [promoCode]);
  // Control whether we show native select text (when open/focused) so options remain visible.
  // Custom dropdown instead of native select for nicer UI
  const [promoOpen, setPromoOpen] = useState(false);
  const promoRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (promoRef.current && !promoRef.current.contains(e.target as Node)) {
        setPromoOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const resolveCartKey = (u = user) => u ? `cart_${u.id}` : 'cart_guest';

  const updateCartItemQuantity = (id: any, quantity: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item));
  };
  const removeFromCart = (id: any) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };
  // clearCart now provided by context removes localStorage key too

  // Removed details toggle per user request; dynamic messages/discount auto-show when present.

  return (
    <div className="h-full flex flex-col">
      <div className="border-b pb-2 mb-2">
        <h2 className="text-primary text-lg sm:text-xl font-bold leading-tight">Shopping Cart ({calculateItemCount(cart)} items)</h2>
        <p className="text-gray-600 text-xs sm:text-sm">Review your items before checkout</p>
      </div>
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl text-gray-300 mb-4">🛒</div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">Your cart is empty</h3>
          <p className="text-gray-500 mb-4">Add some delicious energy bars to get started!</p>
          <Button onClick={() => { closeCart(); setLocation('/products'); }} className="bg-primary hover:bg-green-800">Continue Shopping</Button>
        </div>
      ) : (
        <>
          <div className="mt-2 flex-1 overflow-y-auto pr-1 space-y-3 sm:space-y-4 pb-2">
            {cart.map((item) => (
              <div
                key={item.id}
                className="p-3 sm:p-4 bg-gray-50 rounded-lg flex items-start gap-3"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-medium text-gray-900 text-[13px] sm:text-base leading-snug line-clamp-2">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-[11px] sm:text-sm text-gray-600 m-0">
                      {formatPrice(item.price)} each
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-sm">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                        onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 sm:w-6 text-center text-xs sm:text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                        onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-red-500"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-2 space-y-3 sm:space-y-4">
            {/* Free shipping progress (moved above promo code) */}
            {(() => {
              if (cart.length === 0) return null;
              const subtotal = calculateCartTotal(cart);
              const threshold = 400;
              const effective = subtotal - discount;
              const progress = Math.min(100, Math.round((effective / threshold) * 100));
              const remaining = Math.max(0, threshold - effective);
              return (
                <div className="space-y-1">
                  <div className="relative h-3 w-full bg-gray-200 rounded-full overflow-visible">
                    <div className={`h-3 rounded-full transition-all duration-300 ${freeShipping ? 'bg-green-600' : 'bg-primary'}`} style={{ width: progress + '%' }} />
                    <div
                      className="absolute -top-2 z-10 flex items-center justify-center h-7 w-7 rounded-full shadow-sm ring-1 ring-black/10 pointer-events-none"
                      style={{ left: `calc(${progress}% - 14px)`, background:'#f6f1e6' }}
                      aria-hidden="true"
                    >
                      <Truck
                        className={`h-4 w-4 transition-colors duration-300 ${freeShipping ? 'text-green-700' : 'text-primary'}`}
                        strokeWidth={2}
                        color="currentColor"
                        fill="#f6f1e6"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-600 m-0 font-medium">
                    {freeShipping ? 'You unlocked Free Shipping!' : `Add ${formatPrice(remaining)} more to unlock Free Shipping`}
                  </p>
                </div>
              );
            })()}
            {/* Promo code row */}
            {cart.length > 0 && (
              <form
                onSubmit={e => { e.preventDefault(); if (selectedPromo) applyPromo(selectedPromo); }}
                className="flex items-stretch gap-2"
              >
                <div ref={promoRef} className="relative flex-1">
                  {(() => { /* compute full application status */ return null; })()}
                  { /* Applied fully if discount actually reduces total or free shipping granted */ }
                  { /* discount from context already reflects promo revalidation */ }
                  { /* We'll derive a boolean */ }
                  { /* (keeping inline to avoid extra re-render complexity) */ }
                  { /* variable via IIFE */ }
                  { /* no-op comments for clarity */ }
                  { /* TS will ignore these comments */ }
                  { /* end meta */ }
                  { /* apply boolean below */ }
                  { /* changed styling condition */ }
                  { /* intentionally verbose for future contributors */ }
                  {/* eslint-disable-next-line */}
                  {null}
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={promoOpen}
                    onClick={() => setPromoOpen(o => !o)}
                    className={`w-full border rounded px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-green-500/50 ${(discount > 0 || freeShipping) ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}`}
                  >
                    <span className="truncate font-medium">
                      {promoCode || selectedPromo || 'Select promo code'}
                    </span>
                    <span className="ml-2 text-[10px] text-gray-500">{promoOpen ? '▲' : '▼'}</span>
                  </button>
                  {promoOpen && (
                    <ul
                      role="listbox"
                      className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-md border border-gray-200 bg-white shadow-md text-xs sm:text-sm"
                    >
                      {Object.entries(KNOWN_PROMOS).length === 0 && (
                        <li className="px-3 py-2 text-gray-500">No promos</li>
                      )}
                      {Object.entries(KNOWN_PROMOS).map(([code, desc]) => {
                        const active = (selectedPromo || promoCode) === code;
                        return (
                          <li
                            key={code}
                            role="option"
                            aria-selected={active}
                            onClick={() => { setSelectedPromo(code); setPromoOpen(false); }}
                            className={`px-3 py-2 cursor-pointer hover:bg-green-50 ${active ? 'bg-green-100 font-semibold' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{code}</span>
                              {active && <span className="ml-2 text-[10px] text-green-700">Selected</span>}
                            </div>
                            <p className="mt-0.5 text-[10px] leading-snug text-gray-500 line-clamp-2">{desc}</p>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {(promoCode && (discount > 0 || freeShipping)) && (
                    <div className="absolute -top-2 left-2 bg-green-600 text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm">APPLIED</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    type="submit"
                    className="px-3 text-xs sm:text-sm flex-shrink-0"
                    disabled={!selectedPromo || promoCode === selectedPromo}
                  >Apply</Button>
                  {promoCode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => { clearPromo(); setSelectedPromo(''); }}
                      className="px-2 text-xs sm:text-sm flex-shrink-0"
                      aria-label="Clear promo code"
                    >✕</Button>
                  )}
                </div>
              </form>
            )}
            {/* Auto details (shows only if there is feedback/message/discount) */}
            {(promoToast || promoMessage) && (
              <div className="rounded-md">
                {promoToast && (
                  <div className={`mt-1 text-xs ${promoToast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{promoToast.message}</div>
                )}
                {promoMessage && !promoToast && (
                  <p className="mt-1 text-xs text-blue-600">{promoMessage}</p>
                )}
              </div>
            )}
            {/* Always-visible mini summary */}
              <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 text-xs sm:text-sm font-medium">Subtotal</span>
                <span className="font-semibold text-xs sm:text-sm">{formatPrice(calculateCartTotal(cart))}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-green-700">
                  <span className="text-xs sm:text-sm font-medium">Discount</span>
                  <span className="text-xs sm:text-sm font-semibold">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-700 text-xs sm:text-sm font-medium">Delivery</span>
                <span className="font-semibold text-xs sm:text-sm">{freeShipping ? 'FREE' : formatPrice(50)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(Math.max(0, calculateCartTotal(cart) - discount + (freeShipping ? 0 : 50)))}</span>
            </div>
            <Button
              onClick={() => {
                const cartRaw = localStorage.getItem(resolveCartKey());
                const cartItems = cartRaw ? JSON.parse(cartRaw) : cart;
                if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                  toast({
                    title: "Cart Empty",
                    description: "Please add products to your cart before proceeding.",
                    variant: "destructive",
                  });
                  closeCart();
                  setLocation("/");
                  return;
                }
                // Calculate totals
                const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const deliveryCharges = freeShipping ? 0 : 50;
                const total = Math.max(0, subtotal - discount + deliveryCharges);
                // Merge or create pendingOrder
                let pendingOrder = {};
                try {
                  const pendingOrderRaw = localStorage.getItem('pendingOrder');
                  pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : {};
                } catch {}
                const newPendingOrder = {
                  ...pendingOrder,
                  // cartItems already contain variantLabel and name with variant appended
                  products: cartItems,
                  subtotal,
                  discount,
                  promoCode,
                  promoMessage,
                  deliveryCharges,
                  total,
                };
                localStorage.setItem('pendingOrder', JSON.stringify(newPendingOrder));
                closeCart();
                setLocation("/delivery");
              }}
              className="w-full bg-primary hover:bg-green-800"
            >
              Proceed to Order Form
            </Button>
            <Button onClick={() => { clearCart(); clearPromo(); }} variant="outline" className="w-full">Clear Cart</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default CartSheet;
