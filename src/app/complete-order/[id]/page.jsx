"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

export default function CompleteOrderPage() {
  const { id } = useParams();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [received, setReceived] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/orders/${id}`).then((res) => {
      setOrder(res.data.data);
      setLoading(false);
    });
  }, [id]);

  const submit = async () => {
    await axios.patch("/api/orders/complete", {
      orderGroupId: id,
      receivedAmount: Number(received),
    });

    router.push("/dashboard/orders"); // back
  };

  if (loading) return <p className="p-6 text-white">Loading...</p>;

  return (
    <div className="p-4 max-w-xl mx-auto text-white">

      {/* Header */}
      <h1 className="text-xl font-bold mb-1">
        {order.customer.name}
      </h1>
      <p className="text-gray-400 mb-4">
        📞 {order.customer.phone}
      </p>

      {/* Orders */}
      <div className="space-y-3">
        {order.orders.map((o, i) => (
          <div key={i} className="bg-white/5 p-3 rounded-xl">
            {o.height} × {o.width} ft
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="mt-6">
        <input
          type="number"
          placeholder="Enter received amount"
          value={received}
          onChange={(e) => setReceived(e.target.value)}
          className="w-full p-3 rounded-xl bg-black border border-white/10"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 bg-gray-700 rounded-xl"
        >
          Cancel
        </button>

        <button
          onClick={submit}
          className="flex-1 py-3 bg-green-600 rounded-xl font-bold"
        >
          ✅ Finish
        </button>
      </div>
    </div>
  );
}