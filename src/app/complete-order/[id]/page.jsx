"use client";
// src/app/complete-order/[id]/page.jsx
import { useEffect, useState } from "react";
import axios                   from "axios";
import { useParams, useRouter } from "next/navigation";

export default function CompleteOrderPage() {
  const { id }   = useParams();
  const router   = useRouter();

  const [order,      setOrder]      = useState(null);
  const [received,   setReceived]   = useState("");
  const [loading,    setLoading]    = useState(true);   // ✅ page load
  const [submitting, setSubmitting] = useState(false);  // ✅ FIX BUG 9: submit state
  const [error,      setError]      = useState("");     // ✅ FIX BUG 8: error state
  const [fetchError, setFetchError] = useState("");     // ✅ FIX BUG 8: fetch error

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`/api/orders/${id}`);
        if (res.data?.success) {
          setOrder(res.data.data);
        } else {
          setFetchError("Order load nahi hua — dobara try karo");
        }
      } catch (err) {
        console.error("Order fetch error:", err);
        if (err.response?.status === 404) {
          setFetchError("Order nahi mila — shayad already complete ho gaya");
        } else {
          setFetchError(
            err.response?.data?.error || "Server error — dobara try karo"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const submit = async () => {
    // Basic validation
    if (!received || Number(received) <= 0) {
      setError("Amount enter karo");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await axios.patch("/api/orders/complete", {
        orderGroupId:   id,
        receivedAmount: Number(received),
      });
      router.push("/dashboard/orders");
    } catch (err) {
      console.error("Complete order error:", err);
      setError(
        err.response?.data?.error || "Order complete nahi hua — dobara try karo"
      );
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-amber-400 rounded-full animate-spin" />
          <p>Order load ho raha hai...</p>
        </div>
      </div>
    );
  }
  if (fetchError) {
    return (
      <div className="p-4 max-w-xl mx-auto text-white">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-red-400 font-semibold text-lg mb-1">Error</p>
          <p className="text-gray-400 text-sm mb-5">{fetchError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition"
            >
              🔄 Dobara Try Karo
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm transition"
            >
              ← Wapas Jao
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <label className="block text-sm text-gray-400 mb-2">
          Received Amount (₹)
        </label>
        <input
          type="number"
          placeholder="Amount enter karo"
          value={received}
          onChange={(e) => { setReceived(e.target.value); setError(""); }}
          disabled={submitting}
          className="w-full p-3 rounded-xl bg-black border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-400/50 disabled:opacity-50"
        />
      </div>

      {/* ✅ FIX BUG 8: Submit error message */}
      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.back()}
          disabled={submitting}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          onClick={submit}
          disabled={submitting || !received || Number(received) <= 0}
          className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "✅ Finish"
          )}
        </button>
      </div>
    </div>
  );
}