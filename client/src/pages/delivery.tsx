import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Delivery page logic: Accepts delivery info, validates, merges with order, and proceeds to checkout
export default function DeliveryInfo() {
  const [deliveryInfo, setDeliveryInfo] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
    pincode: ""
  });
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDeliveryInfo({ ...deliveryInfo, [e.target.name]: e.target.value });
  };

  // Validate delivery info
  function validateDeliveryInfo(info: typeof deliveryInfo) {
    if (!info.customerName || info.customerName.length < 2) return "Name must be at least 2 characters.";
    if (!info.customerPhone || info.customerPhone.length < 10) return "Phone number must be at least 10 digits.";
    if (!info.customerEmail || !info.customerEmail.includes("@")) return "Please enter a valid email address.";
    if (!info.address || info.address.length < 10) return "Address must be at least 10 characters.";
    if (!info.city || info.city.length < 2) return "City must be at least 2 characters.";
    if (!info.pincode || info.pincode.length !== 6) return "PIN code must be 6 digits.";
    return null;
  }

  // On submit, merge delivery info into pending order and redirect
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError("");

    // Validate delivery info
    const validationError = validateDeliveryInfo(deliveryInfo);
    if (validationError) {
      setError(validationError);
      setIsProcessing(false);
      return;
    }

    // Get pending order from localStorage
    const pendingOrderRaw = localStorage.getItem("pendingOrder");
    let pendingOrder;
    try {
      pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : null;
    } catch (err) {
      setError("Order data is corrupted. Please start again from the homepage.");
      setIsProcessing(false);
      return;
    }
    if (!pendingOrder) {
      setError("No pending order found. Please start your order from the homepage.");
      setIsProcessing(false);
      return;
    }
    // Accept only if products is a non-empty array
    if (!pendingOrder.products || !Array.isArray(pendingOrder.products) || pendingOrder.products.length === 0) {
      setError("Your cart is empty or order data is invalid. Please start again from the homepage.");
      setIsProcessing(false);
      setTimeout(() => setLocation("/"), 2000);
      return;
    }

    // Merge delivery info into order object and save back to localStorage
    const mergedOrder = {
      ...pendingOrder,
      deliveryInfo: { ...deliveryInfo }
    };
    localStorage.setItem("pendingOrder", JSON.stringify(mergedOrder));
    setIsProcessing(false);
    setLocation("/checkout");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral py-8">
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Delivery Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-semibold mb-1">Full Name</label>
              <input name="customerName" value={deliveryInfo.customerName} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phone Number</label>
              <input name="customerPhone" value={deliveryInfo.customerPhone} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">Email Address</label>
              <input name="customerEmail" value={deliveryInfo.customerEmail} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">Delivery Address</label>
              <textarea name="address" value={deliveryInfo.address} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">City</label>
              <input name="city" value={deliveryInfo.city} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block font-semibold mb-1">PIN Code</label>
              <input name="pincode" value={deliveryInfo.pincode} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-green-800" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Continue to Payment"}
            </Button>
            {error && <div className="text-red-600 font-semibold mt-4">{error}</div>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
