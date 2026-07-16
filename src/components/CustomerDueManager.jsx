"use client";
// src/components/CustomerDueManager.jsx
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { downloadBill } from "@/components/BillPDF";

// ── API ──────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const TODAY = new Date().toISOString().split("T")[0];

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const STATUS_CONFIG = {
  due:     { label: "Due",     bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30"    },
  partial: { label: "Partial", bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/30"  },
  paid:    { label: "Paid",    bg: "bg-green-500/15",  text: "text-green-400",  border: "border-green-500/30"  },
};

// ── Toast ─────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
            className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg border max-w-xs
              ${t.type === "error"   ? "bg-red-500/20 border-red-500/40 text-red-300"
              : t.type === "warning" ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : "bg-green-500/20 border-green-500/40 text-green-300"}`}>
            {t.type === "error" ? "❌ " : t.type === "warning" ? "⚠️ " : "✅ "}{t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return { show, ToastContainer };
}

const emptyItem = () => ({
  name:           "",
  pieces:         "1",
  pricingType:    "perKg",
  weightKg:       "",
  ratePerKg:      "",
  contractAmount: "",
});

const itemLineTotal = (it) =>
  it.pricingType === "contract"
    ? (Number(it.contractAmount) || 0)
    : (Number(it.weightKg) || 0) * (Number(it.ratePerKg) || 0);

function CustomerModal({ existing, onClose, onSave }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name:        existing?.name        || "",
    phone:       existing?.phone       || "",
    address:     existing?.address     || "",
    description: existing?.description || "",
    workDate:    existing?.workDate    || TODAY,
  });
  const [items, setItems] = useState(
    existing?.items?.length
      ? existing.items.map((i) => ({
          name:           i.name || "",
          pieces:         String(i.pieces ?? 1),
          pricingType:    i.pricingType === "contract" ? "contract" : "perKg",
          weightKg:       String(i.weightKg ?? ""),
          ratePerKg:      String(i.ratePerKg ?? ""),
          contractAmount: String(i.contractAmount ?? ""),
        }))
      : [emptyItem()]
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const setItem = (i, k, v) =>
    setItems((p) => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const addItem    = () => setItems((p) => [...p, emptyItem()]);
  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  const grandTotal = items.reduce((s, it) => s + itemLineTotal(it), 0);

  const handleSave = async () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name aur phone required hain"); return;
    }
    const validItems = items.filter((i) => {
      if (!i.name.trim()) return false;
      return i.pricingType === "contract"
        ? Number(i.contractAmount) > 0
        : Number(i.weightKg) > 0 && Number(i.ratePerKg) > 0;
    });
    if (validItems.length === 0) {
      setError("Kam se kam ek valid item required hai — weight+rate ya contract amount daalo"); return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, items: validItems });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl my-4">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-lg">
                {isEdit ? "✏️" : "➕"}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{isEdit ? "Customer Edit Karo" : "Naya Customer Due"}</p>
                <p className="text-[11px] text-gray-500">Customer info aur items bharo</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
          </div>

          <div className="p-6 space-y-5">
            {/* Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Customer Name *</label>
                <input value={form.name} onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Phone *</label>
                <input value={form.phone} onChange={(e) => setField("phone", e.target.value)}
                  placeholder="98XXXXXXXX" type="tel"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Address</label>
                <input value={form.address} onChange={(e) => setField("address", e.target.value)}
                  placeholder="Ghar ka pata"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Work Date</label>
                <input value={form.workDate} onChange={(e) => setField("workDate", e.target.value)}
                  type="date"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-amber-500/50 rounded-xl px-4 py-3 text-white outline-none text-sm transition" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Description / Note</label>
              <textarea value={form.description} onChange={(e) => setField("description", e.target.value)}
                placeholder="Koi extra note ya kaam ki detail..."
                rows={2}
                className="w-full bg-[#06080f] border border-[#1e2235] focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition resize-none" />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Items / Kaam *</label>
                <button onClick={addItem}
                  className="text-xs px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg font-semibold transition">
                  + Item Add Karo
                </button>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((item, i) => {
                    const lineTotal   = itemLineTotal(item);
                    const isContract  = item.pricingType === "contract";
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-[#06080f] border border-[#1e2235] rounded-xl p-3 space-y-2">

                        {/* Row 1 — name + pieces + pricing type toggle + remove */}
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <input value={item.name} onChange={(e) => setItem(i, "name", e.target.value)}
                            placeholder="e.g. Grill, Gate..."
                            className="col-span-5 bg-transparent border border-[#1e2235] focus:border-amber-500/40 rounded-lg px-3 py-2 text-white placeholder-[#2e3248] outline-none text-xs" />
                          <input value={item.pieces} onChange={(e) => setItem(i, "pieces", e.target.value)}
                            placeholder="Pieces" type="number" min="0" title="Kitne piece bane (reference — price mein use nahi hota)"
                            className="col-span-2 bg-transparent border border-[#1e2235] focus:border-amber-500/40 rounded-lg px-2 py-2 text-white placeholder-[#2e3248] outline-none text-xs text-center" />
                          <div className="col-span-4 flex bg-[#0d0f1e] border border-[#1e2235] rounded-lg overflow-hidden text-[10px] font-bold">
                            <button type="button" onClick={() => setItem(i, "pricingType", "perKg")}
                              className={`flex-1 py-2 transition ${!isContract ? "bg-amber-500/20 text-amber-400" : "text-gray-500 hover:text-gray-300"}`}>
                              ⚖️ Per Kg
                            </button>
                            <button type="button" onClick={() => setItem(i, "pricingType", "contract")}
                              className={`flex-1 py-2 transition ${isContract ? "bg-amber-500/20 text-amber-400" : "text-gray-500 hover:text-gray-300"}`}>
                              📝 Contract
                            </button>
                          </div>
                          <button onClick={() => removeItem(i)} disabled={items.length === 1}
                            className="col-span-1 text-red-400/60 hover:text-red-400 transition text-base disabled:opacity-20 flex items-center justify-center">✕</button>
                        </div>

                        {/* Row 2 — pricing fields, depends on pricingType */}
                        {isContract ? (
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-12 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 text-xs">₹</span>
                              <input value={item.contractAmount} onChange={(e) => setItem(i, "contractAmount", e.target.value)}
                                placeholder="Fixed contract amount" type="number" min="0"
                                className="w-full bg-transparent border border-[#1e2235] focus:border-amber-500/40 rounded-lg pl-7 pr-3 py-2 text-white placeholder-[#2e3248] outline-none text-xs" />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-12 gap-2">
                            <input value={item.weightKg} onChange={(e) => setItem(i, "weightKg", e.target.value)}
                              placeholder="Total weight (kg)" type="number" min="0"
                              className="col-span-6 bg-transparent border border-[#1e2235] focus:border-amber-500/40 rounded-lg px-3 py-2 text-white placeholder-[#2e3248] outline-none text-xs" />
                            <div className="col-span-6 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 text-xs">₹</span>
                              <input value={item.ratePerKg} onChange={(e) => setItem(i, "ratePerKg", e.target.value)}
                                placeholder="Rate per kg" type="number" min="0"
                                className="w-full bg-transparent border border-[#1e2235] focus:border-amber-500/40 rounded-lg pl-7 pr-3 py-2 text-white placeholder-[#2e3248] outline-none text-xs" />
                            </div>
                          </div>
                        )}

                        {lineTotal > 0 && (
                          <div className="flex justify-end">
                            <span className="text-[11px] text-amber-400/70 font-semibold">
                              {isContract
                                ? <>Contract = <span className="text-amber-400">{fmt(lineTotal)}</span></>
                                : <>{item.weightKg}kg × ₹{item.ratePerKg}/kg = <span className="text-amber-400">{fmt(lineTotal)}</span></>}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Grand Total */}
              {grandTotal > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-4 bg-amber-500/8 border border-amber-500/20 rounded-xl px-5 py-3 flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total Amount</span>
                  <span className="text-amber-400 font-black text-xl">{fmt(grandTotal)}</span>
                </motion.div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-black transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", boxShadow: "0 4px 20px rgba(245,158,11,0.25)" }}>
                {saving ? "Saving..." : isEdit ? "✓ Update Karo" : "✓ Save Karo"}
              </motion.button>
              <button onClick={onClose}
                className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Payment Modal ─────────────────────────────────────────────────
function PaymentModal({ customer, onClose, onPaid }) {
  const [amount, setAmount]   = useState("");
  const [note,   setNote]     = useState("");
  const [paying, setPaying]   = useState(false);
  const [error,  setError]    = useState("");

  const dueAmount = customer.dueAmount || 0;
  const amtNum    = Number(amount) || 0;

  const handlePay = async () => {
    setError("");
    if (!amtNum || amtNum <= 0) { setError("Amount enter karo"); return; }
    if (amtNum > dueAmount)     { setError(`Max ₹${dueAmount.toLocaleString("en-IN")} pay kar sakte ho`); return; }
    setPaying(true);
    try {
      const { data } = await api.post(`/due/${customer._id}/pay`, {
        amount: amtNum,
        note: note.trim() || `₹${amtNum.toLocaleString("en-IN")} payment`,
      });
      onPaid(data.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Payment nahi hua");
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-amber-500/20 rounded-2xl w-full max-w-sm shadow-2xl">

          <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center text-lg">💰</div>
              <div>
                <p className="text-white font-bold text-sm">Payment Record Karo</p>
                <p className="text-[11px] text-gray-500">{customer.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
          </div>

          <div className="p-6 space-y-4">
            {/* Due summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 rounded-xl py-3">
                <p className="text-white font-bold text-sm">{fmt(customer.totalAmount)}</p>
                <p className="text-[10px] text-gray-500">Total</p>
              </div>
              <div className="bg-green-500/10 rounded-xl py-3">
                <p className="text-green-400 font-bold text-sm">{fmt(customer.paidAmount)}</p>
                <p className="text-[10px] text-gray-500">Paid ✓</p>
              </div>
              <div className="bg-red-500/10 rounded-xl py-3">
                <p className="text-red-400 font-bold text-sm">{fmt(dueAmount)}</p>
                <p className="text-[10px] text-gray-500">Due ⏳</p>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₹</span>
                <input value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }}
                  type="number" min="0" max={dueAmount} placeholder={`Max ${dueAmount.toLocaleString("en-IN")}`}
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-green-500/50 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-bold outline-none transition" autoFocus />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[100, 200, 500, 1000].filter((v) => v <= dueAmount).map((v) => (
                  <button key={v} onClick={() => setAmount(String(v))}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition">
                    ₹{v.toLocaleString("en-IN")}
                  </button>
                ))}
                <button onClick={() => setAmount(String(dueAmount))}
                  className="text-xs px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 rounded-lg text-green-400 transition ml-auto">
                  Full {fmt(dueAmount)}
                </button>
              </div>
            </div>

            {/* Preview */}
            {amtNum > 0 && amtNum <= dueAmount && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Pay karoge</span>
                  <span className="text-white font-bold">{fmt(amtNum)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Baad mein due</span>
                  <span className={`font-bold ${dueAmount - amtNum > 0 ? "text-amber-400" : "text-green-400"}`}>
                    {fmt(dueAmount - amtNum)}
                  </span>
                </div>
                {dueAmount - amtNum === 0 && (
                  <p className="text-green-400 text-xs text-center">🎉 Poora clear ho jayega!</p>
                )}
              </motion.div>
            )}

            {/* Note */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Cash mila, advance..."
                className="w-full bg-[#06080f] border border-[#1e2235] focus:border-green-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handlePay}
                disabled={paying || !amtNum || amtNum <= 0 || amtNum > dueAmount}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 20px rgba(16,185,129,0.2)" }}>
                {paying ? "Processing..." : `💰 Pay ${amtNum > 0 ? fmt(amtNum) : ""}`}
              </motion.button>
              <button onClick={onClose}
                className="px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Customer Detail Drawer ────────────────────────────────────────
function CustomerDrawer({ customer, onClose, onEdit, onPayment, onDelete }) {
  const sc = STATUS_CONFIG[customer.status] || STATUS_CONFIG.due;
  const [billLoading, setBillLoading] = useState(false);

  const handleDownloadBill = async () => {
    setBillLoading(true);
    try {
      await downloadBill(customer);
    } catch (err) {
      console.error("Bill download error:", err);
    } finally {
      setBillLoading(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0d0f1e] border-l border-white/10 shadow-2xl overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 sticky top-0 bg-[#0d0f1e] z-10">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{customer.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                {sc.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">📞 {customer.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="w-8 h-8 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 transition text-sm">✏️</button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Financial summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 border border-white/8 rounded-2xl py-4">
              <p className="text-white font-black text-lg">{fmt(customer.totalAmount)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Total</p>
            </div>
            <div className="bg-green-500/8 border border-green-500/20 rounded-2xl py-4">
              <p className="text-green-400 font-black text-lg">{fmt(customer.paidAmount)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Paid ✓</p>
            </div>
            <div className={`rounded-2xl py-4 border ${customer.dueAmount > 0 ? "bg-red-500/8 border-red-500/20" : "bg-white/5 border-white/8"}`}>
              <p className={`font-black text-lg ${customer.dueAmount > 0 ? "text-red-400" : "text-gray-500"}`}>
                {fmt(customer.dueAmount)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Due ⏳</p>
            </div>
          </div>

          {/* Bill download button */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleDownloadBill} disabled={billLoading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow: "0 4px 20px rgba(59,130,246,0.2)" }}>
            {billLoading ? (
              <>
                <motion.div animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Bill Bana Rahe Hain...
              </>
            ) : "🧾 Bill Download Karo"}
          </motion.button>

          {/* Pay button */}
          {customer.dueAmount > 0 && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={onPayment}
              className="w-full py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 4px 20px rgba(16,185,129,0.2)" }}>
              💰 Payment Record Karo
            </motion.button>
          )}

          {/* Info */}
          <div className="space-y-2">
            {[
              { label: "Work Date", value: fmtDate(customer.workDate) },
              { label: "Address",   value: customer.address || "—" },
            ].map((f) => (
              <div key={f.label} className="flex justify-between items-start bg-white/5 rounded-xl px-4 py-3">
                <span className="text-gray-500 text-sm">{f.label}</span>
                <span className="text-white text-sm text-right font-medium max-w-[60%]">{f.value}</span>
              </div>
            ))}
            {customer.description && (
              <div className="bg-white/5 rounded-xl px-4 py-3">
                <p className="text-gray-500 text-xs mb-1">Note / Description</p>
                <p className="text-white text-sm">{customer.description}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Items / Kaam</p>
            <div className="space-y-2">
              {(customer.items || []).map((item, i) => (
                <div key={i} className="bg-[#06080f] border border-[#1e2235] rounded-xl px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm font-semibold">
                      {item.name}{item.pieces > 1 ? ` (${item.pieces} pcs)` : ""}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {item.pricingType === "contract"
                        ? "Fixed contract"
                        : `${item.weightKg}kg × ₹${item.ratePerKg}/kg`}
                    </p>
                  </div>
                  <p className="text-amber-400 font-bold text-sm">{fmt(item.total)}</p>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-2 border-t border-white/8 mt-1">
                <span className="text-gray-400 text-sm font-semibold">Total</span>
                <span className="text-amber-400 font-black text-lg">{fmt(customer.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {customer.payments?.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                Payment History ({customer.payments.length})
              </p>
              <div className="space-y-2">
                {[...customer.payments].reverse().map((pay, i) => (
                  <div key={i} className="bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-3 flex justify-between items-start">
                    <div>
                      <p className="text-green-400 font-bold text-sm">{fmt(pay.amount)}</p>
                      {pay.note && <p className="text-gray-500 text-xs mt-0.5">{pay.note}</p>}
                    </div>
                    <p className="text-gray-400 text-xs font-mono">{fmtDate(pay.paidOn)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          <button onClick={onDelete}
            className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition text-sm font-semibold">
            🗑️ Record Delete Karo
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function CustomerDueManager() {
  const [customers,  setCustomers]  = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search,     setSearch]     = useState("");

  const [showAdd,     setShowAdd]     = useState(false);
  const [editCustomer,setEditCustomer]= useState(null);
  const [payCustomer, setPayCustomer] = useState(null);
  const [detailCust,  setDetailCust]  = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  const { show: toast, ToastContainer } = useToast();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get("/due", { params });
      setCustomers(data.data || []);
      setStats(data.stats || null);
    } catch (err) {
      toast(err?.response?.data?.error || "Data load nahi hua", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleAdd = async (formData) => {
    const { data } = await api.post("/due", formData);
    toast(`${formData.name} ka due entry ho gaya! 🎉`);
    fetchCustomers();
    return data;
  };

  const handleEdit = async (formData) => {
    const { data } = await api.patch(`/due/${editCustomer._id}`, formData);
    toast("Customer update ho gaya ✅");
    if (detailCust?._id === editCustomer._id) setDetailCust(data.data);
    fetchCustomers();
  };

  const handlePaid = (updatedData) => {
    setCustomers((prev) => prev.map((c) =>
      c._id === payCustomer._id ? { ...c, ...updatedData } : c
    ));
    if (detailCust?._id === payCustomer._id) setDetailCust((p) => ({ ...p, ...updatedData }));
    toast("Payment record ho gaya! 💰");
    fetchCustomers();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/due/${deleteId}`);
      toast("Record delete ho gaya");
      setDeleteId(null);
      setDetailCust(null);
      fetchCustomers();
    } catch (err) {
      toast(err?.response?.data?.error || "Delete nahi hua", "error");
    } finally {
      setDeleting(false);
    }
  };

  const FILTERS = [
    { key: "all",     label: "Sab",     color: "text-white"      },
    { key: "due",     label: "Due",     color: "text-red-400"    },
    { key: "partial", label: "Partial", color: "text-amber-400"  },
    { key: "paid",    label: "Paid",    color: "text-green-400"  },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }} className="text-white p-4 md:p-5 pb-6">
      <ToastContainer />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Customer <span className="text-amber-400">Due</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Customers ke due aur payments track karo</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-black"
          style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", boxShadow: "0 4px 20px rgba(245,158,11,0.25)" }}>
          + ADD
        </button>
      </div>

      {/* Stats Banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Business",  value: fmt(stats.totalBusiness), color: "text-white",       bg: "bg-white/5 border-white/10"         },
            { label: "Total Paid",      value: fmt(stats.totalPaid),     color: "text-green-400",   bg: "bg-green-500/8 border-green-500/20"  },
            { label: "Total Due",       value: fmt(stats.totalDue),      color: "text-red-400",     bg: "bg-red-500/8 border-red-500/20"      },
            { label: "Customers",       value: stats.totalCustomers,     color: "text-amber-400",   bg: "bg-amber-500/8 border-amber-500/20"  },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border px-4 py-4 ${s.bg}`}>
              <p className={`font-black text-xl ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                statusFilter === f.key
                  ? `bg-white/10 ${f.color}`
                  : "text-gray-500 hover:text-white"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Name ya phone dhundho..."
          className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500/40 transition" />
      </div>

      {/* Customer Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white/5 border border-white/8 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-400 font-semibold">Koi customer nahi mila</p>
          <p className="text-gray-600 text-sm mt-1">
            {statusFilter !== "all" || search ? "Filter change karo ya naya entry karo" : "Pehla due entry karo ऊपर button se"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => {
            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.due;
            return (
              <motion.div key={c._id} whileHover={{ scale: 1.01 }}
                onClick={() => setDetailCust(c)}
                className="cursor-pointer bg-[#0d0f1e] border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all">

                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-bold text-base">{c.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">📞 {c.phone}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                    {sc.label}
                  </span>
                </div>

                {/* Address */}
                {c.address && (
                  <p className="text-gray-600 text-xs mb-3 truncate">📍 {c.address}</p>
                )}

                {/* Items preview */}
                <div className="space-y-1 mb-3">
                  {(c.items || []).slice(0, 2).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-400">
                        {item.name} ({item.pricingType === "contract" ? "Contract" : `${item.weightKg}kg`})
                      </span>
                      <span className="text-gray-300">{fmt(item.total)}</span>
                    </div>
                  ))}
                  {c.items?.length > 2 && (
                    <p className="text-gray-600 text-xs">+{c.items.length - 2} aur items...</p>
                  )}
                </div>

                {/* Amounts */}
                <div className="border-t border-white/8 pt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-white font-bold text-sm">{fmt(c.totalAmount)}</p>
                    <p className="text-[10px] text-gray-600">Total</p>
                  </div>
                  <div>
                    <p className="text-green-400 font-bold text-sm">{fmt(c.paidAmount)}</p>
                    <p className="text-[10px] text-gray-600">Paid</p>
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${c.dueAmount > 0 ? "text-red-400" : "text-gray-500"}`}>{fmt(c.dueAmount)}</p>
                    <p className="text-[10px] text-gray-600">Due</p>
                  </div>
                </div>

                {/* Work date */}
                <p className="text-gray-600 text-[10px] mt-2 text-right">{fmtDate(c.workDate)}</p>

                {/* Bill + Pay buttons on card */}
                <div className="mt-3 flex gap-2">
                  <button onClick={async (e) => {
                      e.stopPropagation();
                      try { await downloadBill(c); } catch (err) { console.error("Bill download error:", err); }
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition"
                    style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                    🧾 Bill
                  </button>
                  {c.dueAmount > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setPayCustomer(c); }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition"
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
                      💰 Payment Lo
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAdd && (
          <CustomerModal onClose={() => setShowAdd(false)} onSave={handleAdd} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editCustomer && (
          <CustomerModal existing={editCustomer} onClose={() => setEditCustomer(null)} onSave={handleEdit} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {payCustomer && (
          <PaymentModal customer={payCustomer} onClose={() => setPayCustomer(null)} onPaid={handlePaid} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailCust && (
          <CustomerDrawer
            customer={detailCust}
            onClose={() => setDetailCust(null)}
            onEdit={() => { setEditCustomer(detailCust); setDetailCust(null); }}
            onPayment={() => { setPayCustomer(detailCust); }}
            onDelete={() => setDeleteId(detailCust._id)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)} className="fixed inset-0 bg-black/70 z-[70]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()}
                className="bg-[#0d0f1e] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm">
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">🗑️</div>
                  <h3 className="text-white font-bold text-lg">Record Delete Karein?</h3>
                  <p className="text-gray-400 text-sm mt-2">Yeh action undo nahi ho sakta</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                    {deleting ? "Deleting..." : "Haan, Delete Karo"}
                  </button>
                  <button onClick={() => setDeleteId(null)}
                    className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}