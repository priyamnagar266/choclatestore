import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loadRazorpayScript } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CheckoutForm = ({ orderId, amount }: { orderId: number; amount: number }) => {
  // Get delivery info and cart from sessionStorage
  const deliveryInfo = (() => {
    const info = sessionStorage.getItem('deliveryInfo');
    return info ? JSON.parse(info) : null;
  })();
  const orderData = (() => {
    const data = localStorage.getItem('pendingOrder');
    return data ? JSON.parse(data) : null;
  })();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the imported loadRazorpayScript from utils

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Ensure Razorpay script is loaded
      let scriptLoaded = !!window.Razorpay;
      if (!scriptLoaded) {
        toast({
          title: "Payment Info",
          description: "Loading Razorpay payment script...",
        });
        scriptLoaded = await loadRazorpayScript();
      }
      if (!window.Razorpay) {
        toast({
          title: "Payment Error",
          description: "Razorpay script failed to load. Please check your internet connection and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (!orderId || !amount) {
        toast({
          title: "Order Error",
          description: "Order ID or amount missing. Please refresh and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Step 1: Create Razorpay order (for payment)
      let razorpayOrderRes, razorpayOrder;
      try {
        razorpayOrderRes = await apiRequest("POST", "/api/create-order", {
          amount: amount,
          currency: "INR"
        });
        razorpayOrder = await razorpayOrderRes.json();
      } catch (err: any) {
        let serverMsg = 'Could not create Razorpay order. Please try again later.';
        try {
          // Attempt to re-fetch raw response to parse message (apiRequest already threw, so do manual fetch)
          const raw = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'INR' }) });
          if (!raw.ok) {
            const text = await raw.text();
            serverMsg = text.slice(0,200);
          }
        } catch {}
        toast({
          title: "Server Error",
          description: serverMsg,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (!razorpayOrder.key || !razorpayOrder.orderId) {
        toast({
          title: "Payment Error",
          description: "Razorpay key or orderId not received from server.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Step 2: Create order in MongoDB (real order object)
      let mongoOrderRes, mongoOrder;
      try {
        // Remove any id/_id from orderData before creating a new order
        const { id, _id, ...orderDataWithoutId } = orderData || {};
        // Fix: Ensure items array is correctly mapped to productId and quantity
        const items = Array.isArray(orderDataWithoutId.products)
          ? orderDataWithoutId.products.map((p: any) => ({
              productId: p.id?.toString() || p.productId?.toString() || '',
              quantity: p.quantity
            }))
          : [];
        let authUserId: string | undefined;
        try {
          const authUserRaw = localStorage.getItem('authUser');
            if (authUserRaw) {
              const au = JSON.parse(authUserRaw);
              authUserId = au?.id;
            }
        } catch {}
        const orderPayload = {
          ...orderDataWithoutId,
          userId: authUserId || orderDataWithoutId.userId || '',
          items,
          razorpayOrderId: razorpayOrder.orderId,
          total: amount,
        };
        console.log("[DEBUG] Creating order with payload:", orderPayload);
        mongoOrderRes = await apiRequest("POST", "/api/orders", orderPayload);
        mongoOrder = await mongoOrderRes.json();
        // Ensure the order object has a valid ID before saving
        if (mongoOrder && (mongoOrder._id || mongoOrder.id || mongoOrder.orderId)) {
          localStorage.setItem('pendingOrder', JSON.stringify(mongoOrder));
          localStorage.setItem("order_id", mongoOrder._id || mongoOrder.id || mongoOrder.orderId);
          const orderId = localStorage.getItem("order_id");
          console.log("Order ID saved to localStorage:", orderId);
        } else {
          toast({
            title: "Order Error",
            description: "Order ID missing from server response. Please contact support.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      } catch (err) {
        toast({
          title: "Order Error",
          description: "Could not create order in database. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const options = {
        key: razorpayOrder.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Cokha Energy Bars",
        description: "Premium Brain & Mood Energy Bars",
        order_id: razorpayOrder.orderId,
        handler: async function (response: any) {
          try {
            toast({
              title: "Payment Response",
              description: `Payment ID: ${response.razorpay_payment_id}`,
            });
            // Get pending order from localStorage to send as orderData
            const pendingOrderRaw = localStorage.getItem('pendingOrder');
            const pendingOrder: any = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : {};
            // Normalize items: older flow stored as JSON string in 'items', newer flow stores array in 'products'
            let normalizedItems: any[] = [];
            if (Array.isArray(pendingOrder.items)) {
              normalizedItems = pendingOrder.items;
            } else if (typeof pendingOrder.items === 'string') {
              try { const parsed = JSON.parse(pendingOrder.items); if (Array.isArray(parsed)) normalizedItems = parsed; } catch {}
            }
            if (normalizedItems.length === 0 && Array.isArray(pendingOrder.products)) {
              // Map cart style objects to order item shape { productId, quantity }
              normalizedItems = pendingOrder.products.map((p: any) => ({
                productId: String(p.productId || p.id),
                quantity: Number(p.quantity) || 1,
              }));
            }
            // Attach back so backend always receives an items array
            if (normalizedItems.length > 0) pendingOrder.items = normalizedItems;
            else {
              // No items found – still attempt verification so we can clear cart keys; warn user
              toast({
                title: "Order Data Warning",
                description: "Couldn't fully reconstruct cart, attempting to finalize payment.",
              });
            }
            console.log('[CHECKOUT] pendingOrder before verify-payment (normalized):', pendingOrder);
            const verificationResponseRaw = await apiRequest("POST", "/api/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: pendingOrder
            });
            const verificationResponse = await verificationResponseRaw.json();

            if (verificationResponse.success) {
              // Use the orderId returned from verificationResponse
              const patchOrderId = verificationResponse.orderId;
              if (patchOrderId) {
                // Store order as placed in localStorage for user reference
                const placedOrder = {
                  ...pendingOrder,
                  _id: patchOrderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  status: 'placed',
                  paymentSuccess: true
                };
                // Update pendingOrder with new _id/orderId for future reference
                localStorage.setItem('pendingOrder', JSON.stringify({ ...pendingOrder, _id: patchOrderId }));
                localStorage.setItem('placedOrder', JSON.stringify(placedOrder));
                // PATCH the order status in backend
                const patchRes = await apiRequest("PATCH", `/api/orders/${patchOrderId}/payment`, {
                  razorpayPaymentId: response.razorpay_payment_id,
                  status: 'placed'
                });
                if (patchRes.ok) {
                  toast({
                    title: "Order Placed!",
                    description: "Your order has been placed successfully. Thank you for shopping!",
                  });
                  // Clear sensitive data
                  localStorage.removeItem('pendingOrder');
                  localStorage.removeItem('cart');
                  try { // also clear user-scoped cart key & guest key
                    const authUserRaw = localStorage.getItem('authUser');
                    if (authUserRaw) {
                      const u = JSON.parse(authUserRaw);
                      if (u?.id) localStorage.removeItem(`cart_${u.id}`);
                    }
                    localStorage.removeItem('cart_guest');
                  } catch {}
                  localStorage.removeItem('razorpayPaymentId');
                  localStorage.removeItem('razorpay_order_id');
                  localStorage.removeItem('razorpay_signature');
                  setTimeout(() => {
                    setLocation('/');
                  }, 1500);
                } else {
                  toast({
                    title: "Order Placed!",
                    description: "Payment succeeded, but order update failed. Please contact support.",
                    variant: "destructive",
                  });
                  // Still clear cart because payment succeeded
                  localStorage.removeItem('cart');
                  try {
                    const authUserRaw = localStorage.getItem('authUser');
                    if (authUserRaw) {
                      const u = JSON.parse(authUserRaw);
                      if (u?.id) localStorage.removeItem(`cart_${u.id}`);
                    }
                    localStorage.removeItem('cart_guest');
                  } catch {}
                }
              } else {
                toast({
                  title: "Order Placed!",
                  description: "Your payment was successful, but order ID was not found. Please contact support.",
                  variant: "destructive",
                });
              }
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            toast({
              title: "Payment Verification Failed",
              description: "There was an issue verifying your payment. We'll still clear your cart. Contact support with your payment ID.",
              variant: "destructive",
            });
            try {
              localStorage.removeItem('pendingOrder');
              localStorage.removeItem('cart');
              const authUserRaw = localStorage.getItem('authUser');
              if (authUserRaw) { const u = JSON.parse(authUserRaw); if (u?.id) localStorage.removeItem(`cart_${u.id}`); }
              localStorage.removeItem('cart_guest');
            } catch {}
          }
        },
        prefill: {
          name: deliveryInfo?.customerName || "Customer Name",
          email: deliveryInfo?.customerEmail || "customer@example.com"
        },
        theme: {
          color: "#10B981"
        }
      };
      // Debug: Log Razorpay options after declaration
      console.log("Razorpay options:", options);
      console.log("Razorpay options:", options);

      toast({
        title: "Payment Info",
        description: `Opening Razorpay modal for ₹${amount}`,
      });

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast({
          title: "Payment Failed",
          description: response.error.description,
          variant: "destructive",
        });
      });

      rzp.open();
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Button
        onClick={() => setLocation('/')}
        variant="ghost"
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Delivery Info */}
          {deliveryInfo && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Delivery Information</h3>
              <div className="grid grid-cols-2 gap-4 text-gray-700">
                <div><strong>Name:</strong> {deliveryInfo.customerName}</div>
                <div><strong>Phone:</strong> {deliveryInfo.customerPhone}</div>
                <div><strong>Email:</strong> {deliveryInfo.customerEmail}</div>
                <div><strong>City:</strong> {deliveryInfo.city}</div>
                <div><strong>PIN Code:</strong> {deliveryInfo.pincode}</div>
                <div className="col-span-2"><strong>Address:</strong> {deliveryInfo.address}</div>
              </div>
            </div>
          )}
          {/* Products */}
          {orderData && orderData.products && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Products</h3>
              <ul className="list-disc list-inside text-gray-700">
                {orderData.products.map((item: any, idx: number) => (
                  <li key={idx}>{item.name} x {item.quantity} (₹{item.price} each)</li>
                ))}
              </ul>
            </div>
          )}
          {/* Amounts */}
          <div className="mb-6">
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{orderData?.subtotal}</span></div>
            <div className="flex justify-between"><span>Delivery Charges:</span><span>₹{orderData?.deliveryCharges}</span></div>
            <div className="flex justify-between font-bold text-primary"><span>Total Amount:</span><span>₹{orderData?.total}</span></div>
          </div>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Secure payment powered by Razorpay
              </p>
              <p className="text-xs text-gray-500">
                We accept UPI, Net Banking, Cards & Wallets
              </p>
            </div>
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-primary hover:bg-green-800"
            >
              {isProcessing ? "Processing..." : "Continue to Payment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Checkout() {
  console.log("Rendering Checkout component");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [orderData, setOrderData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Always read full order (with delivery info) from localStorage
    const orderDataRaw = localStorage.getItem('pendingOrder');
    if (!orderDataRaw) {
      setError("No order found. Please start your order from the homepage.");
      return;
    }
    try {
      const parsed = JSON.parse(orderDataRaw);
      setOrderData(parsed);

      // Ensure orderId is consistently generated and stored
      let generatedId = parsed.orderId || parsed.id;
      if (!generatedId) {
        generatedId = Math.floor(Math.random() * 1000000000);
        localStorage.setItem('pendingOrder', JSON.stringify({ ...parsed, orderId: generatedId }));
      }
      setOrderId(generatedId);

      // Validate total amount
      const totalAmount = Number(parsed.total);
      if (isNaN(totalAmount) || totalAmount <= 0) {
        setError("Invalid order amount. Please start again.");
        return;
      }
      setAmount(totalAmount);
    } catch (e) {
      setError("Order data is corrupted. Please start again.");
    }
  }, []);

  const handlePayment = async () => {
    console.log("handlePayment called", { orderId, amount, orderData, error });
    setIsProcessing(true);
    try {
      console.log("Checking Razorpay script:", window.Razorpay);
      // 1. Ensure Razorpay script is loaded globally and only once
      let scriptLoaded = !!window.Razorpay;
      if (!scriptLoaded) {
        console.log("Loading Razorpay script...");
        toast({
          title: "Payment Info",
          description: "Loading Razorpay payment script...",
        });
        scriptLoaded = await loadRazorpayScript();
        console.log("Razorpay script loaded:", scriptLoaded, window.Razorpay);
      }
      if (!window.Razorpay) {
        toast({
          title: "Payment Error",
          description: "Razorpay script failed to load. Please check your internet connection and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      console.log("OrderId or amount missing", { orderId, amount });
      console.log("Calling /api/create-order", { amount });

      // 2. Validate order data (only check orderId and amount for testing Razorpay)
      if (!orderId || !amount) {
        toast({
          title: "Order Error",
          description: "Order ID or amount missing. Please refresh and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // 3. Create Razorpay order
      let orderResponseRaw, orderResponse;
      try {
        orderResponseRaw = await apiRequest("POST", "/api/create-order", {
          amount: amount,
          currency: "INR"
        });
        orderResponse = await orderResponseRaw.json();
        console.log("Order response from /api/create-order:", orderResponse);
        if (!orderResponse.key || !orderResponse.orderId) {
          console.log("Missing Razorpay key or orderId", orderResponse);
        }
      } catch (err) {
        toast({
          title: "Server Error",
          description: "Could not create Razorpay order. Please try again later.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (!orderResponse.key || !orderResponse.orderId) {
        toast({
          title: "Payment Error",
          description: "Razorpay key or orderId not received from server.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // 4. Open Razorpay modal with valid options
      const options = {
        key: orderResponse.key,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "Cokha Energy Bars",
        description: "Premium Brain & Mood Energy Bars",
        order_id: orderResponse.orderId,
        handler: async function (response: any) {
          try {
            toast({
              title: "Payment Response",
              description: `Payment ID: ${response.razorpay_payment_id}`,
            });
            // Always send orderData to backend for verification and order creation
            const pendingOrderRaw = localStorage.getItem('pendingOrder');
            const pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : {};
            // Get userId from localStorage (if user is logged in)
            let userId = undefined;
            try {
              const userRaw = localStorage.getItem('user');
              if (userRaw) {
                const user = JSON.parse(userRaw);
                userId = user.id || user._id || user.userId;
              }
            } catch {}
            // Transform products to items as required by backend
            const items = Array.isArray(pendingOrder.products)
              ? pendingOrder.products.map((p: any) => ({
                  productId: p.id?.toString() || p.productId?.toString() || '',
                  quantity: p.quantity
                }))
              : [];
            // Flatten deliveryInfo
            const delivery = pendingOrder.deliveryInfo || {};
            // Try authUser first (primary source), then previously derived userId
            let authUserId2: string | undefined;
            try {
              const authUserRaw2 = localStorage.getItem('authUser');
              if (authUserRaw2) {
                const au2 = JSON.parse(authUserRaw2);
                authUserId2 = au2?.id;
              }
            } catch {}
            const orderDataForBackend = {
              userId: authUserId2 || userId || '',
              customerName: delivery.customerName || '',
              customerEmail: delivery.customerEmail || '',
              customerPhone: delivery.customerPhone || '',
              address: delivery.address || '',
              city: delivery.city || '',
              pincode: delivery.pincode || '',
              items,
              subtotal: pendingOrder.subtotal,
              deliveryCharges: pendingOrder.deliveryCharges,
              total: pendingOrder.total,
            };
            console.log('[CHECKOUT] orderDataForBackend before verify-payment:', orderDataForBackend);
            const verificationResponseRaw = await apiRequest("POST", "/api/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: orderDataForBackend
            });
            const verificationResponse = await verificationResponseRaw.json();

            if (verificationResponse.success) {
              // Update orderData._id with the returned orderId before checking
              orderData._id = verificationResponse.orderId;
              if (!orderData._id) {
                toast({
                  title: "Order Error",
                  description: "Order ID missing. Please contact support.",
                  variant: "destructive",
                });
                return;
              }
              await apiRequest("PATCH", `/api/orders/${orderData._id}/payment`, {
                razorpayPaymentId: response.razorpay_payment_id,
                status: 'placed'
              });
              toast({
                title: "Payment Successful!",
                description: "Thank you for your purchase! Your order has been confirmed.",
              });
              setTimeout(() => {
                setLocation('/');
              }, 1500);
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            toast({
              title: "Payment Verification Failed",
              description: "There was an issue verifying your payment. Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: orderData?.deliveryInfo?.name,
          email: orderData?.deliveryInfo?.email || "customer@example.com"
        },
        theme: {
          color: "#10B981"
        }
      };

      toast({
        title: "Payment Info",
        description: `Opening Razorpay modal for ₹${amount}`,
      });
    console.log("Opening Razorpay modal");

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast({
          title: "Payment Failed",
          description: response.error.description,
          variant: "destructive",
        });
      });

      rzp.open();
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-neutral py-8">
      <div className="max-w-2xl mx-auto p-6">
        <Button
          onClick={() => setLocation('/')}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-red-600 font-semibold mb-4">{error}</div>
            ) : (
              <>
                {/* Delivery Info */}
                {orderData?.deliveryInfo && (
                  <div className="mb-6">
                    <div className="font-semibold mb-2">Delivery Information:</div>
                    <ul className="text-sm">
                      <li><strong>Name:</strong> {orderData.deliveryInfo.customerName}</li>
                      <li><strong>Phone:</strong> {orderData.deliveryInfo.customerPhone}</li>
                      <li><strong>Email:</strong> {orderData.deliveryInfo.customerEmail}</li>
                      <li><strong>Address:</strong> {orderData.deliveryInfo.address}</li>
                      <li><strong>City:</strong> {orderData.deliveryInfo.city}</li>
                      <li><strong>Pincode:</strong> {orderData.deliveryInfo.pincode}</li>
                    </ul>
                  </div>
                )}
                {/* Products */}
                {orderData?.products && (
                  <div className="mb-6">
                    <div className="font-semibold mb-2">Products:</div>
                    <ul className="list-disc pl-6">
                      {orderData.products.map((p: any, idx: number) => (
                        <li key={idx}>{p.name} x {p.quantity} - ₹{p.price * p.quantity}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Amounts */}
                <div className="mb-6">
                  <div className="flex justify-between"><span>Subtotal:</span><span>₹{orderData?.subtotal}</span></div>
                  <div className="flex justify-between"><span>Delivery Charges:</span><span>₹{orderData?.deliveryCharges}</span></div>
                  <div className="flex justify-between font-bold text-primary"><span>Total Amount:</span><span>₹{orderData?.total}</span></div>
                </div>
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Secure payment powered by Razorpay
                    </p>
                    <p className="text-xs text-gray-500">
                      We accept UPI, Net Banking, Cards & Wallets
                    </p>
                  </div>
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing || !orderData?.products || !orderData?.deliveryInfo}
                    className="w-full bg-primary hover:bg-green-800"
                  >
                    {isProcessing ? "Processing..." : `Pay ₹${amount}`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
