import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CheckoutForm = ({ orderId, amount }: { orderId: number; amount: number }) => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast({
            title: "Payment Error",
            description: "Failed to load payment processor. Please try again.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      // Create Razorpay order
      const orderResponse = await apiRequest("POST", "/api/create-order", {
        amount: amount,
        currency: "INR"
      });

      const options = {
        key: orderResponse.key,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "Cokha Energy Bars",
        description: "Premium Brain & Mood Energy Bars",
        order_id: orderResponse.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment on server
            const verificationResponse = await apiRequest("POST", "/api/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verificationResponse.success) {
              // Update order with payment info
              await apiRequest("PATCH", `/api/orders/${orderId}/payment`, {
                razorpayPaymentId: response.razorpay_payment_id,
                status: 'completed'
              });
              
              toast({
                title: "Payment Successful!",
                description: "Thank you for your purchase! Your order has been confirmed.",
              });
              
              // Redirect to home page after successful payment
              setTimeout(() => {
                setLocation('/');
              }, 2000);
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: "There was an issue verifying your payment. Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: "Customer Name",
          email: "customer@example.com"
        },
        theme: {
          color: "#10B981"
        }
      };

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
      console.error('Payment error:', error);
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
          <CardTitle className="text-2xl text-primary">Complete Your Payment</CardTitle>
          <p className="text-gray-600">Total Amount: ₹{amount}</p>
        </CardHeader>
        <CardContent>
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
              {isProcessing ? "Processing..." : `Pay ₹${amount}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Checkout() {
  const [orderId, setOrderId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get order details from sessionStorage
    const orderData = sessionStorage.getItem('pendingOrder');
    if (!orderData) {
      setLocation('/');
      return;
    }

    const order = JSON.parse(orderData);
    setOrderId(order.id);
    setAmount(parseFloat(order.total));
  }, [setLocation]);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral py-8">
      <CheckoutForm orderId={orderId} amount={amount} />
    </div>
  );
}
