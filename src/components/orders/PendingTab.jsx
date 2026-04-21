"use client";
// src/components/orders/PendingTab.jsx
// Sirf pure pending orders (Partially Completed wale DuesTab mein hain)
// Complete modal — weight, rate, amount fill karo

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  api, fmtDate, fmtAmt, groupOrders,
  METAL_OPTIONS, EMPTY_ENTRY, EMPTY_EXTRA, inp,
} from "./orderUtils";
import { EditOrderModal, CancelOrderModal } from "@/components/OrderEditCancelModal";

const ITEMS_PER_PAGE = 3;

// ─── PendingCard ──────────────────────────────────────────────────
function PendingCard({ order, onComplete, onEdit, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const groups = groupOrders(order.orders);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0d0f1e", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-white font-black text-base">{order.customer.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>
                🔵 Pending
              </span>
            </div>
            <a href={`tel:${order.customer.phone}`}
              className="text-blue-400 font-mono text-sm">📞 {order.customer.phone}</a>
            {order.customer.address &&
              <p className="text-gray-500 text-xs mt-0.5 truncate">📍 {order.customer.address}</p>}
            {order.customer.date &&
              <p className="text-gray-600 text-xs mt-0.5">📅 {fmtDate(order.customer.date)}</p>}
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={onComplete}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", boxShadow: "0 4px 15px rgba(22,163,74,0.3)" }}>
            ✅ Done
          </motion.button>
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          {groups.map(([type, items]) => (
            <span key={type} className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
              {type} ({items.length})
            </span>
          ))}
          <button onClick={() => setExpanded(p => !p)}
            className="text-xs px-3 py-1 rounded-full text-gray-400 hover:text-white transition ml-auto"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {expanded ? "▲ Hide" : "▼ Orders"}
          </button>
        </div>

        {/* Edit / Cancel */}
        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={onEdit}
            className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
            ✏️ Edit
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            🚫 Cancel
          </motion.button>
        </div>
      </div>

      {/* Expanded order items */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="p-4 pt-3 space-y-3">
              {groups.map(([type, items]) => (
                <div key={type}>
                  <p className="text-amber-400 text-xs font-black mb-2 uppercase tracking-wider">{type}</p>
                  <div className="space-y-1.5">
                    {items.map((o, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap rounded-xl px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.03)" }}>
                        <span className="text-gray-600 text-xs w-4">{i + 1}.</span>
                        <span className="text-gray-200 font-mono text-sm">{o.height ?? "—"} × {o.width ?? "—"} ft</span>
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

// ─── Complete Modal ───────────────────────────────────────────────
function CompleteModal({ order, onClose, onSuccess, showToast }) {
  const [entries,    setEntries]    = useState(() => {
    const groups = groupOrders(order.orders);
    const pre    = groups.map(([label]) => ({ ...EMPTY_ENTRY(), label }));
    return pre.length ? pre : [EMPTY_ENTRY()];
  });
  const [received,   setReceived]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateEntry = (idx, field, value) => {
    setEntries(prev => {
      const copy = [...prev];
      copy[idx]  = { ...copy[idx], [field]: value };
      const w = field === "weight"    ? value : copy[idx].weight;
      const r = field === "ratePerKg" ? value : copy[idx].ratePerKg;
      if (w && r) copy[idx].amount = String(Number(w) * Number(r));
      return copy;
    });
  };
  const addEntry    = () => setEntries(p => [...p, EMPTY_ENTRY()]);
  const removeEntry = (idx) => setEntries(p => p.filter((_, i) => i !== idx));
  const addExtra    = (ei) => setEntries(p => { const c=[...p]; c[ei]={...c[ei],extraCharges:[...c[ei].extraCharges,EMPTY_EXTRA()]}; return c; });
  const removeExtra = (ei, xi) => setEntries(p => { const c=[...p]; c[ei].extraCharges=c[ei].extraCharges.filter((_,i)=>i!==xi); return c; });
  const updateExtra = (ei, xi, field, val) => setEntries(p => {
    const c=[...p]; const ex=[...c[ei].extraCharges]; ex[xi]={...ex[xi],[field]:val}; c[ei]={...c[ei],extraCharges:ex}; return c;
  });

  const totalAmount = entries.reduce(
    (sum, e) => sum + (Number(e.amount)||0) + (e.extraCharges||[]).reduce((s,x)=>s+(Number(x.amount)||0),0), 0
  );
  const dueAmt = Math.max(0, totalAmount - (Number(received) || 0));

  const handleSubmit = async () => {
    if (!entries.some(e => e.weight && e.ratePerKg))
      return showToast("Kam se kam ek entry ka weight aur rate bharo", "error");
    if (!received)
      return showToast("Received amount required hai", "error");
    setSubmitting(true);
    try {
      const { data } = await api.patch("/orders/complete", {
        orderGroupId:   order.id,
        completedDate:  new Date().toISOString().split("T")[0],
        entries: entries.map(e => ({
          label:        e.label || "Order",
          weight:       Number(e.weight)    || 0,
          ratePerKg:    Number(e.ratePerKg) || 0,
          amount:       Number(e.amount)    || 0,
          metalType:    e.metalType !== "N/A" ? e.metalType : null,
          extraCharges: (e.extraCharges||[]).map(x => ({ name:x.name, amount:Number(x.amount)||0 })),
        })),
        totalAmount,
        receivedAmount: Number(received),
        dueAmount:      dueAmt,
      });
      if (data.success) {
        showToast(data.summary
          ? `✅ Sale: ${fmtAmt(data.summary.saleAmount)} | Profit: ${fmtAmt(data.summary.grossProfit)}`
          : data.message || "Order complete ho gaya!");
        onSuccess();
      }
    } catch (err) {
      showToast(err?.response?.data?.error || "Complete nahi hua", "error");
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onClose} className="fixed inset-0 z-[9998]"
        style={{background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)"}} />

      <div className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col rounded-t-3xl overflow-hidden"
        style={{background:"#0d0f1e",border:"1px solid rgba(255,255,255,0.1)",borderBottom:"none",maxHeight:"90dvh"}}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="px-5 pt-2 pb-4 flex items-center justify-between flex-shrink-0"
          style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div>
            <h2 className="text-lg font-black text-white">✅ Order Complete Karo</h2>
            <p className="text-xs text-gray-400 mt-0.5">{order.customer.name} • 📞 {order.customer.phone}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300"
            style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)"}}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4" style={{overscrollBehavior:"contain"}}>

          {/* Customer info */}
          <div className="rounded-2xl p-4 grid grid-cols-2 gap-3"
            style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <div><p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">👤 Naam</p><p className="text-white font-semibold text-sm">{order.customer.name}</p></div>
            <div><p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">📞 Phone</p><p className="text-blue-400 text-sm font-mono">{order.customer.phone}</p></div>
            {order.customer.address && (
              <div className="col-span-2"><p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">📍 Address</p><p className="text-gray-300 text-sm">{order.customer.address}</p></div>
            )}
          </div>

          {/* Orders list */}
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">📦 Orders</p>
            <div className="space-y-2">
              {groupOrders(order.orders).map(([itemType, items]) => (
                <div key={itemType} className="rounded-2xl px-4 py-3"
                  style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)"}}>
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
                const entryExtra = (entry.extraCharges||[]).reduce((s,x)=>s+(Number(x.amount)||0),0);
                const metalColor = METAL_OPTIONS.find(m=>m.value===entry.metalType)?.color || "#6b7280";
                return (
                  <div key={ei} className="rounded-2xl p-4 space-y-3"
                    style={{background:"#0c0e1a",border:"1px solid rgba(255,255,255,0.08)"}}>
                    <div className="flex gap-2 items-center">
                      <input value={entry.label} onChange={e=>updateEntry(ei,"label",e.target.value)}
                        placeholder="Label (e.g. Gate, Grill...)" className={inp} />
                      {entries.length > 1 && (
                        <button onClick={()=>removeEntry(ei)}
                          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl text-red-400"
                          style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)"}}>🗑️</button>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-2 text-white/40">⚙️ Metal type</p>
                      <div className="flex gap-2 flex-wrap">
                        {METAL_OPTIONS.map(m=>{
                          const sel = entry.metalType === m.value;
                          return (
                            <motion.button key={m.value} whileTap={{scale:0.9}}
                              onClick={()=>updateEntry(ei,"metalType",m.value)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                              style={{background:sel?`${m.color}20`:"rgba(255,255,255,0.04)",border:`1px solid ${sel?m.color+"50":"rgba(255,255,255,0.1)"}`,color:sel?m.color:"#6b7280"}}>
                              {m.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium">⚖️ Weight (kg)</label>
                        <input type="text" inputMode="decimal" value={entry.weight}
                          onChange={e=>updateEntry(ei,"weight",e.target.value)} placeholder="38.40" className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium">💲 Sale Rate/kg</label>
                        <input type="text" inputMode="decimal" value={entry.ratePerKg}
                          onChange={e=>updateEntry(ei,"ratePerKg",e.target.value)} placeholder="90" className={inp} />
                      </div>
                    </div>
                    {entryBase > 0 && (
                      <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
                        style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)"}}>
                        <span className="text-xs text-gray-400">{entry.weight} kg × ₹{entry.ratePerKg}</span>
                        <span className="text-green-400 font-black text-base">{fmtAmt(entryBase)}</span>
                      </div>
                    )}
                    {(entry.extraCharges||[]).map((ex,xi)=>(
                      <div key={xi} className="flex gap-2 items-center">
                        <span className="text-gray-600 text-sm flex-shrink-0">+</span>
                        <input value={ex.name} onChange={e=>updateExtra(ei,xi,"name",e.target.value)}
                          placeholder="Charge naam" className={inp+" flex-1 text-sm"} />
                        <div className="relative w-28 flex-shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                          <input type="text" inputMode="decimal" value={ex.amount}
                            onChange={e=>updateExtra(ei,xi,"amount",e.target.value)}
                            placeholder="400" className={inp+" pl-7 text-sm"} />
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
                      {(entryBase+entryExtra)>0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500">Entry Total</p>
                          <p className="font-black" style={{color:metalColor}}>{fmtAmt(entryBase+entryExtra)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={addEntry}
              className="mt-3 w-full py-3.5 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-2"
              style={{border:"2px dashed rgba(255,255,255,0.1)"}}>
              ＋ Aur ek entry add karo
            </button>
          </div>

          {/* Payment summary */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{background:"#080a12",border:"1px solid rgba(255,255,255,0.08)"}}>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">💵 Payment Summary</p>
            <div className="border-t border-white/8 pt-3 flex justify-between items-center">
              <span className="text-white font-bold">Grand Total</span>
              <span className="text-amber-400 font-black text-xl">{fmtAmt(totalAmount)}</span>
            </div>
            <div>
              <label className="block text-sm text-gray-400 font-medium mb-2">Kitna Mila? (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-black text-base pointer-events-none">₹</span>
                <input type="text" inputMode="decimal" value={received}
                  onChange={e=>setReceived(e.target.value)}
                  placeholder={`0 – ${totalAmount}`}
                  className={inp+" pl-8 text-lg font-bold py-3.5"} />
              </div>
            </div>
            <AnimatePresence>
              {received && (
                <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                  className="rounded-2xl px-4 py-3.5 flex justify-between items-center"
                  style={{background:dueAmt>0?"rgba(249,115,22,0.1)":"rgba(16,185,129,0.1)",border:dueAmt>0?"1px solid rgba(249,115,22,0.3)":"1px solid rgba(16,185,129,0.3)"}}>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{dueAmt>0?"Baaki Due":"🎉 Poora Clear!"}</p>
                    <p className={`font-black text-2xl ${dueAmt>0?"text-orange-400":"text-green-400"}`}>
                      {dueAmt>0?fmtAmt(dueAmt):"₹ 0"}
                    </p>
                  </div>
                  <span className="text-3xl">{dueAmt>0?"⏳":"🎉"}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="h-2" />
        </div>

        {/* Footer buttons */}
        <div className="flex-shrink-0 px-4 py-4 flex gap-3"
          style={{borderTop:"1px solid rgba(255,255,255,0.08)",background:"#0d0f1e"}}>
          <button onClick={onClose}
            className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl text-gray-300 text-xl"
            style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}>✕</button>
          <button onClick={handleSubmit} disabled={submitting || !received}
            className="flex-1 h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 transition relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
            style={{background:dueAmt>0?"linear-gradient(135deg,#2563eb,#1d4ed8)":"linear-gradient(135deg,#16a34a,#15803d)",boxShadow:dueAmt>0?"0 4px 20px rgba(37,99,235,0.4)":"0 4px 20px rgba(22,163,74,0.4)"}}>
            {!submitting && (
              <motion.div animate={{x:["-100%","200%"]}} transition={{duration:2,repeat:Infinity,ease:"linear",repeatDelay:1}}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 pointer-events-none" />
            )}
            {submitting
              ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              : dueAmt > 0 ? "⏳ Partial Save Karo" : "✅ Complete Karo"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Pagination Component ─────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
        pages.push(p);
      } else if (
        (p === 2 && currentPage > 3) ||
        (p === totalPages - 1 && currentPage < totalPages - 2)
      ) {
        pages.push("...");
      }
    }
    return pages.filter((v, i, arr) => !(v === "..." && arr[i - 1] === "..."));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center gap-3 mt-6"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em]"
        style={{ color: "rgba(245,158,11,0.6)" }}>
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(p => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-black transition-all disabled:opacity-25"
          style={{ background: "rgba(12,14,26,1)", border: "1px solid rgba(245,158,11,0.2)", color: "#6b7280" }}
        >
          ← Prev
        </motion.button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-xs font-black"
                style={{ color: "rgba(245,158,11,0.3)" }}>···</span>
            ) : (
              <motion.button key={p} whileTap={{ scale: 0.85 }} onClick={() => onPageChange(p)}
                className="w-9 h-9 rounded-xl text-sm font-black transition-all"
                style={{
                  background: currentPage === p ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(12,14,26,1)",
                  border: `1px solid ${currentPage === p ? "rgba(245,158,11,0.6)" : "rgba(245,158,11,0.2)"}`,
                  color: currentPage === p ? "#000" : "#6b7280",
                  boxShadow: currentPage === p ? "0 4px 16px rgba(245,158,11,0.35)" : "none",
                }}>
                {p}
              </motion.button>
            )
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(p => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-black transition-all disabled:opacity-25"
          style={{ background: "rgba(12,14,26,1)", border: "1px solid rgba(245,158,11,0.2)", color: "#6b7280" }}
        >
          Next →
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main PendingTab Export ───────────────────────────────────────
export default function PendingTab({ orders, onRefresh, showToast }) {
  const [completeModal, setCompleteModal] = useState(null);
  const [editOrder,     setEditOrder]     = useState(null);
  const [cancelOrder,   setCancelOrder]   = useState(null);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [search,        setSearch]        = useState("");

  const purePending = orders.filter(o => o.status !== "Partially Completed");

  // ─── Search filter: name, phone, address, date, order type ───
  const filtered = purePending.filter(o => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name    = (o.customer?.name    || "").toLowerCase();
    const phone   = (o.customer?.phone   || "").toLowerCase();
    const address = (o.customer?.address || "").toLowerCase();
    const date    = o.customer?.date ? fmtDate(o.customer.date).toLowerCase() : "";
    const types   = groupOrders(o.orders).map(([t]) => t.toLowerCase()).join(" ");
    return name.includes(q) || phone.includes(q) || address.includes(q) || date.includes(q) || types.includes(q);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  if (purePending.length === 0) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p className="text-5xl mb-4">📭</p>
        <p className="text-base font-semibold">Koi pending order nahi!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ─── Search bar ─────────────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: "rgba(245,158,11,0.5)" }}>🔍</span>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Name, phone, address ya order type..."
          className="w-full rounded-xl pl-9 pr-10 py-3 text-white text-sm outline-none transition"
          style={{ background: "#0c0e1a", border: "1px solid rgba(245,158,11,0.2)" }}
        />
        {search && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition text-xs font-black"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.15em]"
          style={{ color: "rgba(245,158,11,0.6)" }}>
          {filtered.length} {search ? "Results" : "Pending Orders"}
        </p>
        {filtered.length > 0 && (
          <p className="text-[10px] font-black uppercase tracking-[0.15em]"
            style={{ color: "rgba(107,114,128,0.5)" }}>
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
          </p>
        )}
      </div>

      {/* No results state */}
      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-white font-black">Koi result nahi mila</p>
          <p className="text-gray-600 text-sm mt-1">"{search}" se kuch match nahi hua</p>
          <button
            onClick={() => handleSearch("")}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}
          >
            Clear Search
          </button>
        </motion.div>
      )}

      {/* Cards with page transition */}
      {filtered.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + search}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {paginated.map(order => (
              <PendingCard
                key={order.id}
                order={order}
                onComplete={() => setCompleteModal(order)}
                onEdit={()    => setEditOrder(order)}
                onCancel={()  => setCancelOrder(order)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Complete Modal */}
      <AnimatePresence>
        {completeModal && (
          <CompleteModal
            order={completeModal}
            onClose={() => setCompleteModal(null)}
            onSuccess={() => { setCompleteModal(null); onRefresh(); }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editOrder && (
          <EditOrderModal
            order={editOrder}
            onClose={() => setEditOrder(null)}
            onSuccess={() => { setEditOrder(null); onRefresh(); showToast("Order update ho gaya ✅"); }}
          />
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelOrder && (
          <CancelOrderModal
            order={cancelOrder}
            onClose={() => setCancelOrder(null)}
            onSuccess={() => { setCancelOrder(null); onRefresh(); showToast("Order cancel ho gaya 🗑️"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}