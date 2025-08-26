import React from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/components/auth-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { calculateCartTotal, calculateItemCount, formatPrice } from "@/lib/products";

const CartSheet: React.FC = () => {
  const { cart, setCart, closeCart } = useCart();
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
  const clearCart = () => setCart([]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b pb-2 mb-2">
        <h2 className="text-primary text-xl font-bold">Shopping Cart ({calculateItemCount(cart)} items)</h2>
        <p className="text-gray-600">Review your selected items before proceeding to checkout</p>
      </div>
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl text-gray-300 mb-4">🛒</div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">Your cart is empty</h3>
          <p className="text-gray-500 mb-4">Add some delicious energy bars to get started!</p>
          <Button onClick={closeCart} className="bg-primary hover:bg-green-800">Continue Shopping</Button>
        </div>
      ) : (
        <>
          <div className="mt-6 flex-1 overflow-y-auto pr-1 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gray-50 rounded-lg flex items-start gap-3"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base leading-snug line-clamp-2">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs sm:text-sm text-gray-600 m-0">
                      {formatPrice(item.price)} each
                    </p>
                    <div className="flex items-center gap-2 bg-white rounded-md px-2 py-1 shadow-sm">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500"
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
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Subtotal</span>
              <span className="font-semibold">{formatPrice(calculateCartTotal(cart))}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Delivery Charges</span>
              <span className="font-semibold">{formatPrice(50)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(calculateCartTotal(cart) + 50)}</span>
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
                const deliveryCharges = 50;
                const total = subtotal + deliveryCharges;
                // Merge or create pendingOrder
                let pendingOrder = {};
                try {
                  const pendingOrderRaw = localStorage.getItem('pendingOrder');
                  pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : {};
                } catch {}
                const newPendingOrder = {
                  ...pendingOrder,
                  products: cartItems,
                  subtotal,
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
            <Button onClick={clearCart} variant="outline" className="w-full">Clear Cart</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default CartSheet;
