"use client";
// src/components/PendingOrders.jsx

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");
  if (token) cfg.headers.Authorization  = `Bearer ${token}`;
  if (role)  cfg.headers["x-user-role"] = role;
  return cfg;
});

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const METAL_OPTIONS = [
  { value: "MS",    label: "MS",             color: "#3b82f6" },
  { value: "GI",    label: "GI",             color: "#10b981" },
  { value: "Other", label: "Other",          color: "#8b5cf6" },
  { value: "N/A",   label: "N/A (Contract)", color: "#6b7280" },
];

const EMPTY_EXTRA = () => ({ name: "", amount: "" });
// ✅ FIX: amount: "" (string) instead of 0 (number) — input bug fix
const EMPTY_ENTRY = () => ({ label: "", weight: "", ratePerKg: "", amount: "", metalType: "MS", extraCharges: [] });

const inp = "w-full bg-[#0c0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/60 transition";

export default function PendingOrders() {
  const [activeTab,       setActiveTab]       = useState("pending");
  const [pendingOrders,   setPendingOrders]   = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState(null);
  const [modal,           setModal]           = useState(null);
  const [entries,         setEntries]         = useState([EMPTY_ENTRY()]);
  const [received,        setReceived]        = useState("");
  const [submitting,      setSubmitting]      = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
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
    orders:         item.orders || [],
    status:         item.orders?.every((o) => o.status === "Partially Completed") ? "Partially Completed" : "Pending",
    lastPayment:    item.lastPayment    || null,
    paymentHistory: item.paymentHistory || [],
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
      await Promise.all([fetchPending(), fetchCompleted()]);
      setLoading(false);
    })();
  }, [fetchPending, fetchCompleted]);

  const openModal = (customer) => {
    setModal(customer);
    const groups = groupOrders(customer.orders);
    const pre    = groups.map(([label]) => ({ ...EMPTY_ENTRY(), label }));
    setEntries(pre.length ? pre : [EMPTY_ENTRY()]);
    setReceived("");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setModal(null);
    setEntries([EMPTY_ENTRY()]);
    setReceived("");
    document.body.style.overflow = "";
  };

  const updateEntry = (idx, field, value) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[idx]  = { ...copy[idx], [field]: value };
      const w = field === "weight"    ? value : copy[idx].weight;
      const r = field === "ratePerKg" ? value : copy[idx].ratePerKg;
      if (w && r) copy[idx].amount = String(Number(w) * Number(r));
      return copy;
    });
  };

  const addEntry    = () => setEntries((p) => [...p, EMPTY_ENTRY()]);
  const removeEntry = (idx) => setEntries((p) => p.filter((_, i) => i !== idx));
  const addExtra    = (ei) => setEntries((p) => { const c=[...p]; c[ei]={...c[ei],extraCharges:[...c[ei].extraCharges,EMPTY_EXTRA()]}; return c; });
  const removeExtra = (ei, xi) => setEntries((p) => { const c=[...p]; c[ei].extraCharges=c[ei].extraCharges.filter((_,i)=>i!==xi); return c; });
  const updateExtra = (ei, xi, field, val) => setEntries((p) => {
    const c=[...p]; const ex=[...c[ei].extraCharges]; ex[xi]={...ex[xi],[field]:val}; c[ei]={...c[ei],extraCharges:ex}; return c;
  });

  const totalAmount = entries.reduce(
    (sum, e) => sum + (Number(e.amount)||0) + (e.extraCharges||[]).reduce((s,x)=>s+(Number(x.amount)||0),0), 0
  );
  const dueAmount = Math.max(0, totalAmount - (Number(received) || 0));

  const submitComplete = async () => {
    if (!entries.some((e) => e.weight && e.ratePerKg))
      return showToast("Kam se kam ek entry ka weight aur rate bharo", "error");
    if (!received)
      return showToast("Received amount required hai", "error");

    setSubmitting(true);
    try {
      const { data } = await api.patch("/orders/complete", {
        orderGroupId:  modal.id,
        completedDate: new Date().toISOString().split("T")[0],
        entries: entries.map((e) => ({
          label:        e.label || "Order",
          weight:       Number(e.weight)    || 0,
          ratePerKg:    Number(e.ratePerKg) || 0,
          amount:       Number(e.amount)    || 0,
          metalType:    e.metalType !== "N/A" ? e.metalType : null,
          extraCharges: (e.extraCharges||[]).map((x)=>({ name:x.name, amount:Number(x.amount)||0 })),
        })),
        totalAmount,
        receivedAmount: Number(received),
        dueAmount,
      });

      if (data.success) {
        showToast(data.summary
          ? `✅ Sale: ${fmtAmt(data.summary.saleAmount)} | Profit: ${fmtAmt(data.summary.grossProfit)}`
          : data.message || "Order complete ho gaya!");
        closeModal();
        await Promise.all([fetchPending(), fetchCompleted()]);
      }
    } catch (err) {
      showToast(err?.response?.data?.error || "Complete nahi hua", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:-50, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-30 }}
            transition={{ type:"spring", stiffness:400, damping:28 }}
            className={`fixed top-4 left-4 right-4 z-[200] px-5 py-4 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-3 ${toast.type==="error"?"border border-red-500/40 text-red-300":"border border-green-500/40 text-green-300"}`}
            style={{ background:toast.type==="error"?"rgba(20,5,5,0.97)":"rgba(5,20,10,0.97)", backdropFilter:"blur(20px)" }}>
            <span className="text-lg flex-shrink-0">{toast.type==="error"?"⚠️":"✅"}</span>
            <span className="flex-1 leading-snug">{toast.msg}</span>
            <button onClick={()=>setToast(null)} className="text-gray-500 hover:text-white transition text-base">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-3">
        {[
          { key:"pending",   label:"⏳ Pending",  count:pendingOrders.length,   on:"bg-amber-500/20 border-amber-500/40 text-amber-300" },
          { key:"completed", label:"✅ Completed", count:completedOrders.length, on:"bg-green-500/20 border-green-500/40 text-green-300"  },
        ].map((t) => (
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab===t.key?t.on:"bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
            {t.label} <span className="ml-1 text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Orders load ho rahe hain...</p>
          </div>
        ) : activeTab === "pending" ? (
          pendingOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-600"><p className="text-5xl mb-4">📭</p><p className="text-base font-semibold">Koi pending order nahi!</p></div>
          ) : pendingOrders.map((c) => (
            <PendingCard key={c.id} customer={c} onComplete={()=>openModal(c)} groupOrders={groupOrders} fmtDate={fmtDate} fmtAmt={fmtAmt} />
          ))
        ) : (
          completedOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-600"><p className="text-5xl mb-4">📦</p><p className="text-base font-semibold">Koi completed order nahi</p></div>
          ) : completedOrders.map((c) => (
            <CompletedCard key={c.id} customer={c} groupOrders={groupOrders} fmtDate={fmtDate} fmtAmt={fmtAmt} />
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={closeModal} className="fixed inset-0 z-[9998]"
              style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }} />

            <div className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col rounded-t-3xl overflow-hidden"
              style={{ background:"#0d0f1e", border:"1px solid rgba(255,255,255,0.1)", borderBottom:"none", maxHeight:"90dvh" }}>

              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="px-5 pt-2 pb-4 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <h2 className="text-lg font-black text-white" style={{ fontFamily:"'Syne',sans-serif" }}>✅ Order Complete Karo</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{modal.customer.name} • 📞 {modal.customer.phone}</p>
                </div>
                <button onClick={closeModal}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition"
                  style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)" }}>✕</button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4" style={{ overscrollBehavior:"contain" }}>

                {/* Customer */}
                <div className="rounded-2xl p-4 grid grid-cols-2 gap-3"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div><p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">👤 Naam</p><p className="text-white font-semibold text-sm">{modal.customer.name}</p></div>
                  <div><p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">📞 Phone</p><p className="text-blue-400 text-sm font-mono">{modal.customer.phone}</p></div>
                  {modal.customer.address && (
                    <div className="col-span-2"><p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">📍 Address</p><p className="text-gray-300 text-sm">{modal.customer.address}</p></div>
                  )}
                </div>

                {/* Orders */}
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">📦 Orders</p>
                  <div className="space-y-2">
                    {groupOrders(modal.orders).map(([itemType, items]) => (
                      <div key={itemType} className="rounded-2xl px-4 py-3"
                        style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)" }}>
                        <p className="text-amber-400 font-black text-sm mb-2">{itemType} <span className="text-gray-500 font-normal text-xs">({items.length} pcs)</span></p>
                        <div className="space-y-1.5">
                          {items.map((o, i) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-600 text-xs w-5">{i+1}.</span>
                              <span className="text-gray-200 text-sm font-mono bg-white/5 px-2 py-0.5 rounded-lg">{o.height??"—"} × {o.width??"—"} ft</span>
                              {o.metalType && <span className="text-gray-400 text-xs">{o.metalType}</span>}
                              {o.description && <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{o.description}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment entries */}
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-3">💰 Payment Entries</p>
                  <div className="space-y-3">
                    {entries.map((entry, ei) => {
                      const entryBase  = Number(entry.amount) || 0;
                      const entryExtra = (entry.extraCharges||[]).reduce((s,x)=>s+(Number(x.amount)||0), 0);
                      const entryTotal = entryBase + entryExtra;
                      const metalColor = METAL_OPTIONS.find(m=>m.value===entry.metalType)?.color || "#6b7280";

                      return (
                        <div key={ei} className="rounded-2xl p-4 space-y-3"
                          style={{ background:"#0c0e1a", border:"1px solid rgba(255,255,255,0.08)" }}>

                          <div className="flex gap-2 items-center">
                            <input value={entry.label} onChange={e=>updateEntry(ei,"label",e.target.value)}
                              placeholder="Label (e.g. Gate, Grill...)" className={inp} />
                            {entries.length > 1 && (
                              <button onClick={()=>removeEntry(ei)}
                                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl text-red-400"
                                style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)" }}>🗑️</button>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold mb-2 text-white/40">⚙️ Kaun sa iron use hua?</p>
                            <div className="flex gap-2 flex-wrap">
                              {METAL_OPTIONS.map(m=>{
                                const sel = entry.metalType === m.value;
                                return (
                                  <motion.button key={m.value} whileTap={{scale:0.9}}
                                    onClick={()=>updateEntry(ei,"metalType",m.value)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                    style={{ background:sel?`${m.color}20`:"rgba(255,255,255,0.04)", border:`1px solid ${sel?m.color+"50":"rgba(255,255,255,0.1)"}`, color:sel?m.color:"#6b7280" }}>
                                    {m.label}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5 font-medium">⚖️ Weight (kg)</label>
                              {/* ✅ FIX: type="text" inputMode="decimal" */}
                              <input type="text" inputMode="decimal" value={entry.weight}
                                onChange={e=>updateEntry(ei,"weight",e.target.value)} placeholder="38.40" className={inp} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5 font-medium">💲 Sale Rate/kg</label>
                              {/* ✅ FIX: type="text" inputMode="decimal" */}
                              <input type="text" inputMode="decimal" value={entry.ratePerKg}
                                onChange={e=>updateEntry(ei,"ratePerKg",e.target.value)} placeholder="90" className={inp} />
                            </div>
                          </div>

                          {entryBase > 0 && (
                            <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
                              style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)" }}>
                              <span className="text-xs text-gray-400">{entry.weight} kg × ₹{entry.ratePerKg}</span>
                              <span className="text-green-400 font-black text-base">{fmtAmt(entryBase)}</span>
                            </div>
                          )}

                          {(entry.extraCharges||[]).map((ex,xi)=>(
                            <div key={xi} className="flex gap-2 items-center">
                              <span className="text-gray-600 text-sm flex-shrink-0">+</span>
                              <input value={ex.name} onChange={e=>updateExtra(ei,xi,"name",e.target.value)}
                                placeholder="Charge naam" className={inp + " flex-1 text-sm"} />
                              <div className="relative w-28 flex-shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                {/* ✅ FIX: type="text" inputMode="decimal" */}
                                <input type="text" inputMode="decimal" value={ex.amount}
                                  onChange={e=>updateExtra(ei,xi,"amount",e.target.value)}
                                  placeholder="400" className={inp + " pl-7 text-sm"} />
                              </div>
                              <button onClick={()=>removeExtra(ei,xi)}
                                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-red-400 text-sm">✕</button>
                            </div>
                          ))}

                          <div className="flex items-center justify-between">
                            <button onClick={()=>addExtra(ei)}
                              className="text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl font-medium">
                              + Extra charge
                            </button>
                            {entryTotal > 0 && (
                              <div className="text-right">
                                <p className="text-[10px] text-gray-500">Entry Total</p>
                                <p className="font-black" style={{color:metalColor}}>{fmtAmt(entryTotal)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={addEntry}
                    className="mt-3 w-full py-3.5 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-2"
                    style={{ border:"2px dashed rgba(255,255,255,0.1)" }}>
                    ＋ Aur ek entry add karo
                  </button>
                </div>

                {/* Payment summary */}
                <div className="rounded-2xl p-4 space-y-3"
                  style={{ background:"#080a12", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">💵 Payment Summary</p>
                  {entries.filter(e=>e.amount).map((e,i)=>{
                    const mc = METAL_OPTIONS.find(m=>m.value===e.metalType)?.color||"#6b7280";
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400 flex items-center gap-1.5">
                            {e.label||`Entry ${i+1}`}
                            {e.metalType && e.metalType!=="N/A" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{background:`${mc}15`,color:mc}}>{e.metalType}</span>
                            )}
                          </span>
                          <span className="text-gray-200 font-medium">{fmtAmt(e.amount)}</span>
                        </div>
                        {(e.extraCharges||[]).filter(x=>x.amount).map((x,xi)=>(
                          <div key={xi} className="flex justify-between text-xs text-gray-600 pl-3">
                            <span>+ {x.name||"Extra"}</span><span>{fmtAmt(x.amount)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div className="border-t border-white/8 pt-3 flex justify-between items-center">
                    <span className="text-white font-bold">Grand Total</span>
                    <span className="text-amber-400 font-black text-xl">{fmtAmt(totalAmount)}</span>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 font-medium mb-2">Kitna Mila? (Received Amount)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-black text-base pointer-events-none">₹</span>
                      {/* ✅ FIX: type="text" inputMode="decimal" */}
                      <input type="text" inputMode="decimal" value={received}
                        onChange={e=>setReceived(e.target.value)}
                        placeholder={`0 – ${totalAmount}`}
                        className={inp + " pl-8 text-lg font-bold py-3.5"} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {received && (
                      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                        className="rounded-2xl px-4 py-3.5 flex justify-between items-center"
                        style={{ background:dueAmount>0?"rgba(249,115,22,0.1)":"rgba(16,185,129,0.1)", border:dueAmount>0?"1px solid rgba(249,115,22,0.3)":"1px solid rgba(16,185,129,0.3)" }}>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">{dueAmount>0?"Baaki Due":"🎉 Poora Clear!"}</p>
                          <p className={`font-black text-2xl ${dueAmount>0?"text-orange-400":"text-green-400"}`}>{dueAmount>0?fmtAmt(dueAmount):"₹ 0"}</p>
                        </div>
                        <span className="text-3xl">{dueAmount>0?"⏳":"🎉"}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="h-2" />
              </div>

              {/* Action buttons */}
              <div className="flex-shrink-0 px-4 py-4 flex gap-3"
                style={{ borderTop:"1px solid rgba(255,255,255,0.08)", background:"#0d0f1e" }}>
                <button onClick={closeModal}
                  className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl text-gray-300 hover:text-white transition text-xl"
                  style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>✕</button>
                <button onClick={submitComplete} disabled={submitting || !received}
                  className="flex-1 h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 transition relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background:dueAmount>0?"linear-gradient(135deg,#2563eb,#1d4ed8)":"linear-gradient(135deg,#16a34a,#15803d)", boxShadow:dueAmount>0?"0 4px 20px rgba(37,99,235,0.4)":"0 4px 20px rgba(22,163,74,0.4)" }}>
                  {!submitting && (
                    <motion.div animate={{ x:["-100%","200%"] }} transition={{ duration:2, repeat:Infinity, ease:"linear", repeatDelay:1 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 pointer-events-none" />
                  )}
                  {submitting ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  ) : dueAmount>0 ? "⏳ Partial Save Karo" : "✅ Complete Karo"}
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PendingCard({ customer, onComplete, groupOrders, fmtDate, fmtAmt }) {
  const [expanded, setExpanded] = useState(false);
  const groups    = groupOrders(customer.orders);
  const isPartial = customer.status === "Partially Completed";
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className="rounded-2xl overflow-hidden"
      style={{ background:"#0d0f1e", border:`1px solid ${isPartial?"rgba(59,130,246,0.3)":"rgba(255,255,255,0.08)"}` }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-white font-black text-base">{customer.customer.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                style={isPartial?{background:"rgba(59,130,246,0.15)",color:"#60a5fa",border:"1px solid rgba(59,130,246,0.3)"}:{background:"rgba(245,158,11,0.15)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.3)"}}>
                {isPartial?"⏳ Partial":"🔵 Pending"}
              </span>
            </div>
            <a href={`tel:${customer.customer.phone}`} className="text-blue-400 font-mono text-sm flex items-center gap-1.5">📞 {customer.customer.phone}</a>
            {customer.customer.address && <p className="text-gray-500 text-xs mt-0.5 truncate">📍 {customer.customer.address}</p>}
            {customer.customer.date && <p className="text-gray-600 text-xs mt-0.5">📅 {fmtDate(customer.customer.date)}</p>}
          </div>
          <motion.button whileTap={{scale:0.92}} onClick={onComplete}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
            style={isPartial?{background:"linear-gradient(135deg,#2563eb,#1d4ed8)",boxShadow:"0 4px 15px rgba(37,99,235,0.3)"}:{background:"linear-gradient(135deg,#16a34a,#15803d)",boxShadow:"0 4px 15px rgba(22,163,74,0.3)"}}>
            {isPartial?"💳 Pay":"✅ Done"}
          </motion.button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {groups.map(([itemType,items])=>(
            <span key={itemType} className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.2)"}}>
              {itemType} ({items.length})
            </span>
          ))}
          <button onClick={()=>setExpanded(p=>!p)}
            className="text-xs px-3 py-1 rounded-full text-gray-400 hover:text-white transition ml-auto"
            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}>
            {expanded?"▲ Hide":"▼ Show"}
          </button>
        </div>
        {isPartial && customer.lastPayment && (
          <div className="mt-3 rounded-xl px-3 py-2.5 flex justify-between items-center"
            style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)"}}>
            <div>
              <p className="text-[11px] text-gray-500">{fmtDate(customer.lastPayment.completedDate)} ko partial pay hua</p>
              <p className="text-blue-400 font-black text-base mt-0.5">Due: {fmtAmt(customer.lastPayment.dueAmount)}</p>
            </div>
            <span className="text-2xl">⏳</span>
          </div>
        )}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}}
            className="overflow-hidden" style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <div className="p-4 pt-3 space-y-3">
              {groups.map(([itemType,items])=>(
                <div key={itemType}>
                  <p className="text-amber-400 text-xs font-black mb-2 uppercase tracking-wider">{itemType}</p>
                  <div className="space-y-1.5">
                    {items.map((o,i)=>(
                      <div key={i} className="flex items-center gap-2 flex-wrap rounded-xl px-3 py-2" style={{background:"rgba(255,255,255,0.03)"}}>
                        <span className="text-gray-600 text-xs w-4">{i+1}.</span>
                        <span className="text-gray-200 font-mono text-sm">{o.height??"—"} × {o.width??"—"} ft</span>
                        {o.metalType && <span className="text-gray-500 text-xs ml-auto">{o.metalType}</span>}
                        {o.description && <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{o.description}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CompletedCard({ customer, groupOrders, fmtDate, fmtAmt }) {
  const [expanded, setExpanded] = useState(false);
  const groups  = groupOrders(customer.orders);
  const payment = customer.payment;
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className="rounded-2xl overflow-hidden"
      style={{background:"#0d0f1e",border:"1px solid rgba(16,185,129,0.15)"}}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-white font-black text-base">{customer.customer.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{background:"rgba(16,185,129,0.15)",color:"#34d399",border:"1px solid rgba(16,185,129,0.3)"}}>✓ Complete</span>
            </div>
            <a href={`tel:${customer.customer.phone}`} className="text-blue-400 font-mono text-sm flex items-center gap-1.5">📞 {customer.customer.phone}</a>
            {payment?.completedDate && <p className="text-gray-600 text-xs mt-0.5">✅ {fmtDate(payment.completedDate)}</p>}
          </div>
          <button onClick={()=>setExpanded(p=>!p)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition"
            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}>
            {expanded?"▲":"▼ Details"}
          </button>
        </div>
        {payment?.totalAmount && (
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-0 rounded-xl px-3 py-2 text-center" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)"}}>
              <p className="text-[10px] text-gray-500">Total</p><p className="text-green-400 font-black">{fmtAmt(payment.totalAmount)}</p>
            </div>
            <div className="flex-1 min-w-0 rounded-xl px-3 py-2 text-center" style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)"}}>
              <p className="text-[10px] text-gray-500">Mila</p><p className="text-blue-400 font-black">{fmtAmt(payment.receivedAmount)}</p>
            </div>
            {payment.grossProfit !== undefined && (
              <div className="flex-1 min-w-0 rounded-xl px-3 py-2 text-center"
                style={payment.grossProfit>=0?{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)"}:{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>
                <p className="text-[10px] text-gray-500">Profit</p>
                <p className={`font-black ${payment.grossProfit>=0?"text-emerald-400":"text-red-400"}`}>{payment.grossProfit>=0?"+":""}{fmtAmt(payment.grossProfit)}</p>
              </div>
            )}
            {payment.dueAmount > 0 && (
              <div className="flex-1 min-w-0 rounded-xl px-3 py-2 text-center" style={{background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)"}}>
                <p className="text-[10px] text-gray-500">Due</p><p className="text-orange-400 font-black">{fmtAmt(payment.dueAmount)}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}}
            className="overflow-hidden" style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <div className="p-4 space-y-4">
              {payment?.materialUsage?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">⚙️ Iron Used</p>
                  <div className="flex gap-2 flex-wrap">
                    {payment.materialUsage.map((m,i)=>{
                      const mc = METAL_OPTIONS.find(opt=>opt.value===m.metalType)?.color||"#6b7280";
                      return (
                        <div key={i} className="rounded-xl px-3 py-2" style={{background:`${mc}10`,border:`1px solid ${mc}25`}}>
                          <p className="font-bold text-sm" style={{color:mc}}>{m.metalType}</p>
                          <p className="text-gray-400 text-xs">{m.kgUsed?.toFixed(2)} kg × ₹{m.purchaseRate}</p>
                          <p className="text-red-400 text-xs font-bold">Cost: {fmtAmt(m.materialCost)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {payment?.entries?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">💰 Breakdown</p>
                  <div className="space-y-2">
                    {payment.entries.map((e,i)=>{
                      const extras=(e.extraCharges||[]).filter(x=>x.amount);
                      const total=Number(e.amount||0)+extras.reduce((s,x)=>s+Number(x.amount||0),0);
                      return (
                        <div key={i} className="rounded-xl px-4 py-3" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-white font-bold text-sm">{e.label||`Entry ${i+1}`}</p>
                            <p className="text-green-400 font-black">{fmtAmt(total)}</p>
                          </div>
                          <p className="text-xs text-gray-500">{e.weight} kg × ₹{e.ratePerKg}/kg = {fmtAmt(e.amount)}</p>
                          {extras.map((x,xi)=>(
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
    </motion.div>
  );
}