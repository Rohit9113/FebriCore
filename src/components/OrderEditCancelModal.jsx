"use client";
// src/components/OrderEditCancelModal.jsx
//
// ✅ NEW Feature 2: Order Edit + Cancel
//
// Do modals ek file mein:
// 1. EditOrderModal  — Customer info + order items edit karo
// 2. CancelOrderModal — Confirm karke order cancel karo

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// ─── API ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Helpers ──────────────────────────────────────────────────────
const inp = `w-full bg-[#06080f] border border-[#1e2235] rounded-xl px-4 py-3
             text-white text-sm placeholder-[#2e3248] outline-none transition-all
             focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/12`;

// ═══════════════════════════════════════════════════════════════════
// EDIT ORDER MODAL
// ═══════════════════════════════════════════════════════════════════
export function EditOrderModal({ order, onClose, onSuccess }) {
  // Customer form state
  const [customer, setCustomer] = useState({
    name:    order.customer?.name    || "",
    phone:   order.customer?.phone   || "",
    address: order.customer?.address || "",
  });

  // Orders form state — copy from existing orders
  const [orderItems, setOrderItems] = useState(
    (order.orders || []).map(o => ({ ...o }))
  );

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [activeTab, setActiveTab] = useState("customer"); // "customer" | "items"

  const setCust = (k, v) => setCustomer(p => ({ ...p, [k]: v }));
  const setItem = (idx, k, v) => setOrderItems(p =>
    p.map((item, i) => i === idx ? { ...item, [k]: v } : item)
  );

  const handleSave = async () => {
    if (!customer.name?.trim() || !customer.phone?.trim()) {
      setError("Customer naam aur phone required hain"); return;
    }
    setSaving(true); setError("");
    try {
      const { data } = await api.patch(`/orders/${order.id}`, {
        customer,
        orders: orderItems.map(o => ({
          orderId:     o.orderId,
          height:      o.height      ? Number(o.height)      : undefined,
          width:       o.width       ? Number(o.width)       : undefined,
          perKgRate:   o.perKgRate   ? Number(o.perKgRate)   : undefined,
          extraCharge: o.extraCharge ? Number(o.extraCharge) : undefined,
          amount:      o.amount      ? Number(o.amount)      : undefined,
          description: o.description,
          metalType:   o.metalType,
          itemType:    o.itemType,
        })),
      });

      if (data.success) {
        onSuccess(data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Update nahi hua — dobara try karo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-white/10 rounded-2xl w-full max-w-lg
                     shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25
                              flex items-center justify-center text-lg">✏️</div>
              <div>
                <p className="text-white font-bold text-sm">Order Edit Karo</p>
                <p className="text-[11px] text-gray-500">
                  {order.customer?.name} · {order.orders?.length} items
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10
                         flex items-center justify-center text-gray-400 hover:text-white transition">
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/8 flex-shrink-0">
            {[
              { id: "customer", label: "👤 Customer Info" },
              { id: "items",    label: "📦 Order Items"   },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-3 text-sm font-bold transition-all
                  ${activeTab === t.id
                    ? "text-amber-400 border-b-2 border-amber-400"
                    : "text-gray-500 hover:text-gray-300"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content — scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* ── Customer Tab ───────────────────────────────────── */}
            {activeTab === "customer" && (
              <motion.div
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    👤 Customer Name *
                  </label>
                  <input className={inp} value={customer.name}
                    onChange={e => setCust("name", e.target.value)}
                    placeholder="Customer ka naam" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    📞 Phone Number *
                  </label>
                  <input className={inp} type="tel" value={customer.phone}
                    onChange={e => setCust("phone", e.target.value)}
                    placeholder="9876543210" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    📍 Address
                  </label>
                  <textarea className={`${inp} resize-none`} rows={3}
                    value={customer.address}
                    onChange={e => setCust("address", e.target.value)}
                    placeholder="Ghar ka pata" />
                </div>
              </motion.div>
            )}

            {/* ── Items Tab ──────────────────────────────────────── */}
            {activeTab === "items" && (
              <motion.div
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                className="space-y-4">
                {orderItems.map((item, idx) => (
                  <div key={idx}
                    className="bg-white/[0.02] border border-white/8 rounded-2xl p-4 space-y-3">

                    {/* Item header */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25
                                      flex items-center justify-center text-xs font-black text-amber-400">
                        {idx + 1}
                      </div>
                      <p className="text-white font-bold text-sm">
                        {item.itemType || item.orderType || "Order Item"}
                      </p>
                      {item.metalType && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-lg font-bold
                                         bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          {item.metalType}
                        </span>
                      )}
                    </div>

                    {/* Dimensions */}
                    {(item.height !== undefined || item.width !== undefined) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                            Height (ft)
                          </label>
                          <input className={inp} type="text" inputMode="decimal"
                            value={item.height || ""}
                            onChange={e => setItem(idx, "height", e.target.value)}
                            placeholder="e.g. 6" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                            Width (ft)
                          </label>
                          <input className={inp} type="text" inputMode="decimal"
                            value={item.width || ""}
                            onChange={e => setItem(idx, "width", e.target.value)}
                            placeholder="e.g. 4" />
                        </div>
                      </div>
                    )}

                    {/* Rate & Extra Charge */}
                    <div className="grid grid-cols-2 gap-3">
                      {item.perKgRate !== undefined && (
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                            Rate/kg (₹)
                          </label>
                          <input className={inp} type="text" inputMode="decimal"
                            value={item.perKgRate || ""}
                            onChange={e => setItem(idx, "perKgRate", e.target.value)}
                            placeholder="e.g. 85" />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                          Amount (₹)
                        </label>
                        <input className={inp} type="text" inputMode="decimal"
                          value={item.amount || ""}
                          onChange={e => setItem(idx, "amount", e.target.value)}
                          placeholder="Total amount" />
                      </div>
                    </div>

                    {/* Extra charge */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                        Extra Charge (₹)
                      </label>
                      <input className={inp} type="text" inputMode="decimal"
                        value={item.extraCharge || ""}
                        onChange={e => setItem(idx, "extraCharge", e.target.value)}
                        placeholder="0" />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                        Description
                      </label>
                      <input className={inp}
                        value={item.description || ""}
                        onChange={e => setItem(idx, "description", e.target.value)}
                        placeholder="Koi note..." />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/8 flex-shrink-0 space-y-3">
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">⚠️ {error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-black transition
                           disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)",
                         boxShadow: "0 4px 20px rgba(245,158,11,0.25)" }}>
                {saving ? (
                  <>
                    <motion.div animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full" />
                    Saving...
                  </>
                ) : "✅ Update Karo"}
              </motion.button>
              <button onClick={onClose}
                className="px-5 py-3 rounded-xl border border-white/10 text-gray-400
                           hover:bg-white/5 hover:text-white transition text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CANCEL ORDER MODAL
// ═══════════════════════════════════════════════════════════════════
export function CancelOrderModal({ order, onClose, onSuccess }) {
  const [cancelling, setCancelling] = useState(false);
  const [error,      setError]      = useState("");

  const isPartiallyPaid = order.orders?.some(
    o => o.status === "Partially Completed"
  );

  const handleCancel = async () => {
    setCancelling(true); setError("");
    try {
      const { data } = await api.delete(`/orders/${order.id}`);
      if (data.success) {
        onSuccess(order.id);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Order cancel nahi hua — dobara try karo");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1,   y: 0  }}
        exit={{    opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-red-500/30 rounded-2xl w-full max-w-sm
                     shadow-2xl shadow-red-500/10 p-6"
        >
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25
                         flex items-center justify-center text-3xl">
              🚫
            </motion.div>
          </div>

          <h3 className="text-white font-bold text-xl text-center mb-2">
            Order Cancel Karna Chahte Ho?
          </h3>
          <p className="text-gray-400 text-sm text-center mb-5">
            Yeh action undo nahi ho sakta
          </p>

          {/* Order info */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Customer</span>
              <span className="text-white font-semibold text-sm">{order.customer?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Phone</span>
              <span className="text-gray-300 text-sm">{order.customer?.phone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Items</span>
              <span className="text-amber-400 font-bold text-sm">{order.orders?.length} orders</span>
            </div>
          </div>

          {/* Warning for partially paid */}
          {isPartiallyPaid && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-orange-500/10 border border-orange-500/25 rounded-xl px-4 py-3 mb-4">
              <p className="text-orange-400 text-sm font-semibold">
                ⚠️ Partially paid order cancel nahi ho sakta
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Customer ne pehle se payment di hai — admin se manually handle karo
              </p>
            </motion.div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCancel}
              disabled={cancelling || isPartiallyPaid}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold
                         rounded-xl text-sm transition disabled:opacity-40
                         disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {cancelling ? (
                <>
                  <motion.div animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Cancelling...
                </>
              ) : "Haan, Cancel Karo"}
            </motion.button>
            <button onClick={onClose}
              className="flex-1 py-3 border border-white/10 text-gray-300
                         hover:bg-white/5 hover:text-white rounded-xl text-sm
                         font-bold transition">
              Nahi, Wapas Jao
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}