import React, { useEffect, useState } from "react";
import axios from "axios";

interface Order {
  id: number;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  // Add more fields as needed
}

const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get("/api/orders/me");
        setOrders(response.data.orders || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div>Loading order history...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Order History</h2>
      {orders.length === 0 ? (
        <div>No orders found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white shadow-md rounded-lg p-6 border border-gray-200 flex flex-col gap-2"
            >
              <div className="font-semibold text-lg mb-2">Order #{order.orderId}</div>
              <div>
                <span className="font-medium">Amount:</span> {order.amount} {order.currency}
              </div>
              <div>
                <span className="font-medium">Status:</span> <span className={`px-2 py-1 rounded text-white ${order.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}`}>{order.status}</span>
              </div>
              <div>
                <span className="font-medium">Date:</span> {new Date(order.createdAt).toLocaleString()}
              </div>
              {/* Add more order details here if needed */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
