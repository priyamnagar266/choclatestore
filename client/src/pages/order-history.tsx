import React, { useEffect, useState } from "react";
import { useAuth } from "../components/auth-context";

async function fetchOrderHistory(token: string) {
  const res = await fetch("/api/orders/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch orders");
  return data.orders;
}

export default function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const orders = await fetchOrderHistory(user.token);
        setOrders(orders);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [user]);

  if (!user) return <div className="p-8">Please log in to view your orders.</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-4">Order History</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {orders.length === 0 && !loading ? (
        <div>No orders found.</div>
      ) : (
        <ul className="space-y-4">
          {orders.map(order => (
            <li key={order.id} className="bg-white rounded shadow p-4">
              <div><strong>Order ID:</strong> {order.id}</div>
              <div><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</div>
              <div><strong>Status:</strong> {order.status}</div>
              <div><strong>Total:</strong> ₹{order.total}</div>
              <div><strong>Items:</strong> {order.items}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
