//src/components/PendingOrders.jsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

// ─── axios instance ──────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (role)  cfg.headers["x-user-role"] = role;
  return cfg;
});

// ─── helpers ────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const EMPTY_EXTRA = () => ({ name: "", amount: "" });
const EMPTY_ENTRY = () => ({ label: "", weight: "", ratePerKg: "", amount: 0, extraCharges: [] });
const statusColor = (s) => {
  if (s === "Pending")             return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (s === "Partially Completed") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s === "Completed")           return "bg-green-500/20 text-green-400 border-green-500/30";
  return "bg-white/10 text-gray-400 border-white/10";
};

// shared input style — large touch target
const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition";

// ════════════════════════════════════════════════
export default function PendingOrders() {
  const [activeTab,       setActiveTab]       = useState("pending");
  const [pendingOrders,   setPendingOrders]   = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState(null);
  const [modal,           setModal]           = useState(null);

  const [entries,    setEntries]    = useState([EMPTY_ENTRY()]);
  const [received,   setReceived]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const groupOrders = (orders) => {
    const map = {};
    (orders || []).forEach((o) => {
      const k = o.itemType || "Order";
      if (!map[k]) map[k] = [];
      map[k].push(o);
    });
    return Object.entries(map);
  };

  const normalizeOrder = (item) => ({
    id: item._id,
    customer: {
      name:    item.customer?.name,
      phone:   item.customer?.phone,
      address: item.customer?.address,
      date:    item.orders?.[0]?.date,
    },
    orders:      item.orders || [],
    status:      item.orders?.every((o) => o.status === "Partially Completed") ? "Partially Completed" : "Pending",
    lastPayment: item.lastPayment || null,
  });

  const normalizeCompleted = (item) => ({
    id: item._id,
    customer: {
      name:    item.customer?.name,
      phone:   item.customer?.phone,
      address: item.customer?.address,
      date:    item.createdAt,
    },
    orders:  item.orders || [],
    payment: item.paymentReceive || {},
  });

  const fetchPending = useCallback(async () => {
    try {
      const { data } = await api.get("/orders");
      if (data.success) setPendingOrders(data.data.map(normalizeOrder));
    } catch (err) {
      showToast(err?.response?.data?.error || "Orders load nahi hua", "error");
    }
  }, []);

  const fetchCompleted = useCallback(async () => {
    try {
      const { data } = await api.get("/orders/complete");
      if (data.success) setCompletedOrders(data.data.map(normalizeCompleted));
    } catch (err) {
      showToast(err?.response?.data?.error || "Completed load nahi hua", "error");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPending();
      await fetchCompleted();
      setLoading(false);
    })();
  }, [fetchPending, fetchCompleted]);

  // ── Open modal ──────────────────────────────
  const openModal = (customer) => {
    setModal(customer);
    const groups = groupOrders(customer.orders);
    const pre = groups.map(([label]) => ({ ...EMPTY_ENTRY(), label }));
    setEntries(pre.length ? pre : [EMPTY_ENTRY()]);
    setReceived("");
    // prevent body scroll
    document.body.style.overflow = "hidden";
  };
  const closeModal = () => {
    setModal(null);
    setEntries([EMPTY_ENTRY()]);
    setReceived("");
    document.body.style.overflow = "";
  };

  // ── Entry mutations ─────────────────────────
  const updateEntry = (idx, field, value) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      const w = field === "weight"    ? value : copy[idx].weight;
      const r = field === "ratePerKg" ? value : copy[idx].ratePerKg;
      if (w && r) copy[idx].amount = Number(w) * Number(r);
      return copy;
    });
  };
  const addEntry    = () => setEntries((p) => [...p, EMPTY_ENTRY()]);
  const removeEntry = (idx) => setEntries((p) => p.filter((_, i) => i !== idx));
  const addExtra    = (ei) => setEntries((p) => { const c = [...p]; c[ei] = { ...c[ei], extraCharges: [...c[ei].extraCharges, EMPTY_EXTRA()] }; return c; });
  const removeExtra = (ei, xi) => setEntries((p) => { const c = [...p]; c[ei].extraCharges = c[ei].extraCharges.filter((_, i) => i !== xi); return c; });
  const updateExtra = (ei, xi, field, val) => setEntries((p) => {
    const c = [...p]; const ex = [...c[ei].extraCharges]; ex[xi] = { ...ex[xi], [field]: val };
    c[ei] = { ...c[ei], extraCharges: ex }; return c;
  });

  const totalAmount = entries.reduce((sum, e) => {
    return sum + (Number(e.amount) || 0) + (e.extraCharges || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  }, 0);
  const dueAmount = Math.max(0, totalAmount - (Number(received) || 0));

  // ── Submit ──────────────────────────────────
  const submitComplete = async () => {
    if (!entries.some((e) => e.weight && e.ratePerKg))
      return showToast("Kam se kam ek entry ka weight aur rate bharo", "error");
    if (!received)
      return showToast("Received amount required hai", "error");

    setSubmitting(true);
    try {
      const { data } = await api.patch("/orders/complete", {
        orderGroupId:  modal.id,
        completedDate: new Date().toISOString(),
        entries: entries.map((e) => ({
          label:        e.label || "Order",
          weight:       Number(e.weight),
          ratePerKg:    Number(e.ratePerKg),
          amount:       Number(e.amount),
          extraCharges: (e.extraCharges || []).map((x) => ({ name: x.name, amount: Number(x.amount) || 0 })),
        })),
        totalAmount,
        receivedAmount: Number(received),
        dueAmount,
      });
      if (data.success) {
        showToast(data.message);
        closeModal();
        await fetchPending();
        await fetchCompleted();
      }
    } catch (err) {
      showToast(err?.response?.data?.error || "Complete nahi hua", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c0e14] text-white pb-24" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Toast ─────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className={`fixed top-4 left-4 right-4 z-[200] px-4 py-3.5 rounded-2xl text-sm font-semibold shadow-2xl border flex items-center gap-2
              ${toast.type === "error"
                ? "bg-[#1a0a0a] border-red-500/50 text-red-300"
                : "bg-[#0a1a0f] border-green-500/50 text-green-300"}`}>
            <span className="text-lg flex-shrink-0">{toast.type === "error" ? "⚠️" : "✅"}</span>
            <span className="flex-1">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#0c0e14]/95 backdrop-blur-md border-b border-white/8 px-4 py-4">
        <h1 className="text-xl font-black tracking-tight text-white">📋 Orders Manager</h1>
        <p className="text-xs text-gray-500 mt-0.5">Pending aur completed orders</p>
      </div>

      {/* ── Tabs ──────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 bg-[#0c0e14] sticky top-[69px] z-20 border-b border-white/5">
        {[
          { key: "pending",   label: "⏳ Pending",  count: pendingOrders.length,   activeClass: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
          { key: "completed", label: "✅ Completed", count: completedOrders.length, activeClass: "bg-green-500/20 border-green-500/40 text-green-300" },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border
              ${activeTab === t.key ? t.activeClass : "bg-white/5 border-white/10 text-gray-400"}`}>
            {t.label}
            <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────── */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : activeTab === "pending" ? (
          pendingOrders.length === 0 ? (
            <div className="text-center py-24 text-gray-600">
              <p className="text-5xl mb-3">📭</p>
              <p className="text-sm">Koi pending order nahi</p>
            </div>
          ) : (
            pendingOrders.map((c) => (
              <PendingCard key={c.id} customer={c} onComplete={() => openModal(c)} groupOrders={groupOrders} fmtDate={fmtDate} fmtAmt={fmtAmt} />
            ))
          )
        ) : (
          completedOrders.length === 0 ? (
            <div className="text-center py-24 text-gray-600">
              <p className="text-5xl mb-3">📦</p>
              <p className="text-sm">Koi completed order nahi</p>
            </div>
          ) : (
            completedOrders.map((c) => (
              <CompletedCard key={c.id} customer={c} groupOrders={groupOrders} fmtDate={fmtDate} fmtAmt={fmtAmt} />
            ))
          )
        )}
      </div>

      {/* ═══════════════════════════════════════════
          BOTTOM SHEET MODAL (mobile-native feel)
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {modal && (
          <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#13151f] rounded-t-3xl shadow-2xl flex flex-col"
              style={{ maxHeight: "93vh" }}>

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Sheet Header */}
              <div className="px-5 pt-2 pb-4 flex items-center justify-between border-b border-white/8 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-black text-white">✅ Order Complete</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{modal.customer.name} • {modal.customer.phone}</p>
                </div>
                <button onClick={closeModal}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-gray-300 text-lg active:bg-white/20 transition">
                  ✕
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4 overscroll-contain">

                {/* Customer card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Naam</p>
                    <p className="text-white font-bold text-sm">{modal.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Phone</p>
                    <p className="text-gray-200 text-sm">{modal.customer.phone}</p>
                  </div>
                  {modal.customer.address && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Address</p>
                      <p className="text-gray-200 text-sm">{modal.customer.address}</p>
                    </div>
                  )}
                </div>

                {/* Orders list */}
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">📦 Orders</p>
                  <div className="space-y-2">
                    {groupOrders(modal.orders).map(([itemType, items]) => (
                      <div key={itemType} className="bg-[#0f1117] border border-white/8 rounded-2xl px-4 py-3">
                        <p className="text-amber-400 font-black text-sm mb-2">
                          {itemType} <span className="text-gray-600 font-normal text-xs">({items.length} pcs)</span>
                        </p>
                        <div className="space-y-1.5">
                          {items.map((o, i) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-600 text-xs w-5">{i + 1}.</span>
                              <span className="text-gray-200 text-sm font-mono bg-white/5 px-2 py-0.5 rounded-lg">
                                {o.height ?? "—"} × {o.width ?? "—"}
                              </span>
                              {o.metalType && <span className="text-gray-500 text-xs">{o.metalType}</span>}
                              {o.description && (
                                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                  {o.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── PAYMENT ENTRIES ── */}
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">💰 Payment Entries</p>
                  <div className="space-y-3">
                    {entries.map((entry, ei) => {
                      const entryBase  = Number(entry.amount) || 0;
                      const entryExtra = (entry.extraCharges || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
                      const entryTotal = entryBase + entryExtra;
                      return (
                        <div key={ei} className="bg-[#0f1117] border border-white/10 rounded-2xl p-4 space-y-3">

                          {/* Label row */}
                          <div className="flex gap-2 items-center">
                            <input
                              value={entry.label}
                              onChange={(e) => updateEntry(ei, "label", e.target.value)}
                              placeholder="Label (e.g. Grill, Gate...)"
                              className={inp + " text-sm py-2.5"}
                            />
                            {entries.length > 1 && (
                              <button onClick={() => removeEntry(ei)}
                                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-red-500/20 text-red-400 rounded-xl active:bg-red-500/40 transition text-base">
                                🗑️
                              </button>
                            )}
                          </div>

                          {/* Weight + Rate side by side */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5 font-medium">⚖️ Weight (kg)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={entry.weight}
                                onChange={(e) => updateEntry(ei, "weight", e.target.value)}
                                placeholder="38.40"
                                className={inp}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5 font-medium">💲 Rate/kg</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={entry.ratePerKg}
                                onChange={(e) => updateEntry(ei, "ratePerKg", e.target.value)}
                                placeholder="90"
                                className={inp}
                              />
                            </div>
                          </div>

                          {/* Auto amount display */}
                          {entryBase > 0 && (
                            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
                              <span className="text-xs text-gray-400">
                                {entry.weight}kg × ₹{entry.ratePerKg}
                              </span>
                              <span className="text-green-400 font-black text-base">{fmtAmt(entryBase)}</span>
                            </div>
                          )}

                          {/* Extra Charges */}
                          {(entry.extraCharges || []).map((ex, xi) => (
                            <div key={xi} className="flex gap-2 items-center">
                              <span className="text-gray-600 text-sm flex-shrink-0">+</span>
                              <input
                                value={ex.name}
                                onChange={(e) => updateExtra(ei, xi, "name", e.target.value)}
                                placeholder="Charge (e.g. Fitting)"
                                className={inp + " text-sm py-2.5 flex-1"}
                              />
                              <div className="relative w-28 flex-shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={ex.amount}
                                  onChange={(e) => updateExtra(ei, xi, "amount", e.target.value)}
                                  placeholder="400"
                                  className={inp + " pl-7 py-2.5 text-sm"}
                                />
                              </div>
                              <button onClick={() => removeExtra(ei, xi)}
                                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-red-500/15 text-red-400 rounded-xl active:bg-red-500/30 transition">
                                ✕
                              </button>
                            </div>
                          ))}

                          {/* Add extra + entry total */}
                          <div className="flex items-center justify-between">
                            <button onClick={() => addExtra(ei)}
                              className="flex items-center gap-1.5 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl active:bg-blue-500/25 transition font-medium">
                              <span>+</span> Extra charge
                            </button>
                            {entryTotal > 0 && (
                              <div className="text-right">
                                <p className="text-[10px] text-gray-600">Entry Total</p>
                                <p className="text-amber-400 font-black">{fmtAmt(entryTotal)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Entry button */}
                  <button onClick={addEntry}
                    className="mt-3 w-full py-3.5 border-2 border-dashed border-white/10 active:border-amber-400/40 text-gray-400 active:text-amber-300 rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2">
                    ＋ Aur ek entry add karo
                  </button>
                </div>

                {/* ── PAYMENT SUMMARY ── */}
                <div className="bg-[#0a0c12] border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">💵 Payment Summary</p>

                  {/* Per entry breakdown */}
                  {entries.filter((e) => e.amount).map((e, i) => {
                    const extras = (e.extraCharges || []).filter((x) => x.amount);
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{e.label || `Entry ${i + 1}`}</span>
                          <span className="text-gray-300 font-medium">{fmtAmt(e.amount)}</span>
                        </div>
                        {extras.map((x, xi) => (
                          <div key={xi} className="flex justify-between text-xs text-gray-600 pl-3">
                            <span>+ {x.name || "Extra"}</span>
                            <span>{fmtAmt(x.amount)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                    <span className="text-white font-bold">Grand Total</span>
                    <span className="text-amber-400 font-black text-xl">{fmtAmt(totalAmount)}</span>
                  </div>

                  {/* Received input */}
                  <div>
                    <label className="block text-sm text-gray-400 font-medium mb-2">Received Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-black text-base">₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={received}
                        onChange={(e) => setReceived(e.target.value)}
                        placeholder={`0 – ${totalAmount}`}
                        className={inp + " pl-8 text-lg font-bold py-3.5"}
                      />
                    </div>
                  </div>

                  {/* Due / Cleared display */}
                  <AnimatePresence>
                    {received && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`rounded-2xl px-4 py-3.5 flex justify-between items-center border
                          ${dueAmount > 0 ? "bg-orange-500/10 border-orange-500/25" : "bg-green-500/10 border-green-500/25"}`}>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">{dueAmount > 0 ? "Due Baaki" : "🎉 Poora Cleared!"}</p>
                          <p className={`font-black text-2xl ${dueAmount > 0 ? "text-orange-400" : "text-green-400"}`}>
                            {dueAmount > 0 ? fmtAmt(dueAmount) : "₹ 0"}
                          </p>
                        </div>
                        <span className="text-3xl">{dueAmount > 0 ? "⏳" : "🎉"}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* bottom spacer so content isn't hidden behind sticky button */}
                <div className="h-4" />
              </div>

              {/* Sticky action buttons */}
              <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-white/8 bg-[#13151f] flex gap-3">
                <button onClick={closeModal}
                  className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-white/8 border border-white/10 rounded-2xl text-gray-300 text-xl active:bg-white/15 transition">
                  ✕
                </button>
                <button
                  onClick={submitComplete}
                  disabled={submitting || !received}
                  className={`flex-1 h-14 rounded-2xl font-black text-base transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2
                    ${dueAmount > 0
                      ? "bg-blue-600 active:bg-blue-500 text-white"
                      : "bg-green-600 active:bg-green-500 text-white"}`}>
                  {submitting
                    ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                    : dueAmount > 0 ? "⏳ Partial Save" : "✅ Complete Karo"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════
// PENDING CARD
// ════════════════════════════════════════════════
function PendingCard({ customer, onComplete, groupOrders, fmtDate, fmtAmt }) {
  const [expanded, setExpanded] = useState(false);
  const groups    = groupOrders(customer.orders);
  const isPartial = customer.status === "Partially Completed";

  return (
    <div className={`bg-[#13151f] border rounded-2xl overflow-hidden
      ${isPartial ? "border-blue-500/30" : "border-white/8"}`}>

      {/* Top section */}
      <div className="p-4">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-black text-base leading-tight">{customer.customer.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${
                isPartial ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}>
                {isPartial ? "⏳ Partial" : "🔵 Pending"}
              </span>
            </div>
            {/* Phone big and tappable */}
            <a href={`tel:${customer.customer.phone}`}
              className="text-blue-400 font-mono text-sm mt-1 flex items-center gap-1.5 active:text-blue-300">
              📞 {customer.customer.phone}
            </a>
            {customer.customer.address && (
              <p className="text-gray-500 text-xs mt-0.5">📍 {customer.customer.address}</p>
            )}
            {customer.customer.date && (
              <p className="text-gray-600 text-xs mt-0.5">📅 {fmtDate(customer.customer.date)}</p>
            )}
          </div>
          {/* Complete button — big tap target */}
          <button onClick={onComplete}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition
              ${isPartial ? "bg-blue-600 active:bg-blue-500 text-white" : "bg-green-600 active:bg-green-500 text-white"}`}>
            {isPartial ? "💳 Pay" : "✅ Done"}
          </button>
        </div>

        {/* Item type pills */}
        <div className="flex gap-2 flex-wrap mt-2">
          {groups.map(([itemType, items]) => (
            <span key={itemType}
              className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-semibold">
              {itemType} ({items.length})
            </span>
          ))}
          {/* Expand toggle */}
          <button onClick={() => setExpanded((p) => !p)}
            className="text-xs px-3 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-full active:bg-white/10 transition ml-auto">
            {expanded ? "▲ Hide" : "▼ Show"}
          </button>
        </div>

        {/* Partial payment info */}
        {isPartial && customer.lastPayment && (
          <div className="mt-3 bg-blue-500/8 border border-blue-500/20 rounded-xl px-3 py-2.5 flex justify-between items-center">
            <div>
              <p className="text-[11px] text-gray-500">{fmtDate(customer.lastPayment.completedDate)} ko partial pay hua</p>
              <p className="text-blue-400 font-black text-base mt-0.5">Due: {fmtAmt(customer.lastPayment.dueAmount)}</p>
            </div>
            <span className="text-2xl">⏳</span>
          </div>
        )}
      </div>

      {/* Expanded orders */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/5">
            <div className="p-4 pt-3 space-y-3">
              {groups.map(([itemType, items]) => (
                <div key={itemType}>
                  <p className="text-amber-400 text-xs font-black mb-2 uppercase tracking-wider">{itemType}</p>
                  <div className="space-y-1.5">
                    {items.map((o, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap bg-white/[0.03] rounded-xl px-3 py-2">
                        <span className="text-gray-600 text-xs w-4">{i + 1}.</span>
                        <span className="text-gray-200 font-mono text-sm font-medium">
                          {o.height ?? "—"} × {o.width ?? "—"}
                        </span>
                        {o.metalType && <span className="text-gray-500 text-xs ml-auto">{o.metalType}</span>}
                        {o.description && (
                          <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{o.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════
// COMPLETED CARD
// ════════════════════════════════════════════════
function CompletedCard({ customer, groupOrders, fmtDate, fmtAmt }) {
  const [expanded, setExpanded] = useState(false);
  const groups  = groupOrders(customer.orders);
  const payment = customer.payment;

  return (
    <div className="bg-[#13151f] border border-green-500/15 rounded-2xl overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-black text-base">{customer.customer.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-bold">
                ✓ Done
              </span>
            </div>
            <a href={`tel:${customer.customer.phone}`}
              className="text-blue-400 font-mono text-sm mt-1 flex items-center gap-1.5">
              📞 {customer.customer.phone}
            </a>
            {payment?.completedDate && (
              <p className="text-gray-600 text-xs mt-0.5">✅ {fmtDate(payment.completedDate)}</p>
            )}
          </div>
          <button onClick={() => setExpanded((p) => !p)}
            className="flex-shrink-0 px-3 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-xs active:bg-white/10 transition">
            {expanded ? "▲" : "▼ Details"}
          </button>
        </div>

        {/* Amount pills */}
        {payment?.totalAmount && (
          <div className="flex gap-2 flex-wrap mt-3">
            <div className="flex-1 min-w-0 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">Total</p>
              <p className="text-green-400 font-black text-base">{fmtAmt(payment.totalAmount)}</p>
            </div>
            <div className="flex-1 min-w-0 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">Received</p>
              <p className="text-blue-400 font-black text-base">{fmtAmt(payment.receivedAmount)}</p>
            </div>
            {payment.dueAmount > 0 && (
              <div className="flex-1 min-w-0 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-gray-500">Due</p>
                <p className="text-orange-400 font-black text-base">{fmtAmt(payment.dueAmount)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/5">
            <div className="p-4 space-y-4">
              {/* Orders */}
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">📦 Orders</p>
                <div className="space-y-2">
                  {groups.map(([itemType, items]) => (
                    <div key={itemType} className="bg-white/[0.03] rounded-xl px-4 py-3">
                      <p className="text-amber-400 font-black text-xs mb-2">{itemType}</p>
                      <div className="space-y-1">
                        {items.map((o, i) => (
                          <p key={i} className="text-gray-300 text-sm font-mono">
                            {i + 1}. {o.height ?? "—"} × {o.width ?? "—"}{o.description ? ` (${o.description})` : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment breakdown */}
              {payment?.entries?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">💰 Payment Breakdown</p>
                  <div className="space-y-2">
                    {payment.entries.map((e, i) => {
                      const extras = (e.extraCharges || []).filter((x) => x.amount);
                      const eTotal = Number(e.amount || 0) + extras.reduce((s, x) => s + Number(x.amount || 0), 0);
                      return (
                        <div key={i} className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-white font-bold text-sm">{e.label || `Entry ${i + 1}`}</p>
                            <p className="text-green-400 font-black">{fmtAmt(eTotal)}</p>
                          </div>
                          <p className="text-xs text-gray-500">{e.weight}kg × ₹{e.ratePerKg}/kg = {fmtAmt(e.amount)}</p>
                          {extras.map((x, xi) => (
                            <div key={xi} className="flex justify-between text-xs text-gray-600 mt-0.5 pl-2">
                              <span>+ {x.name}</span><span>{fmtAmt(x.amount)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}