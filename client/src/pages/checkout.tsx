import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ orderId, amount }: { orderId: number; amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Update order with payment info
      try {
        await apiRequest("PATCH", `/api/orders/${orderId}/payment`, {
          stripePaymentId: paymentIntent.id,
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
      } catch (updateError) {
        console.error('Error updating order:', updateError);
        toast({
          title: "Payment Successful",
          description: "Your payment was processed, but there was an issue updating your order. Please contact support.",
          variant: "destructive",
        });
      }
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="w-full bg-primary hover:bg-green-800"
            >
              {isProcessing ? "Processing..." : `Pay ₹${amount}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
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

    // Create PaymentIntent
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: parseFloat(order.total) 
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error('Error creating payment intent:', error);
        setLocation('/');
      });
  }, [setLocation]);

  if (!clientSecret || !orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral py-8">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm orderId={orderId} amount={amount} />
      </Elements>
    </div>
  );
}
