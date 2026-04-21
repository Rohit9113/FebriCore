"use client";
// src/components/orders/DuesTab.jsx
// Sirf "Partially Completed" orders
// Simple payment modal — sirf date + amount

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, fmtDate, fmtAmt } from "./orderUtils";
import { buildWALink, buildDuePaymentMessage } from "./whatsappUtils"; // ✅ FIX 31

const ITEMS_PER_PAGE = 3;

// ─── DueCard ──────────────────────────────────────────────────────
function DueCard({ order, onPay }) {
  const [showHistory, setShowHistory] = useState(false);

  const paymentHistory  = order.paymentHistory || [];
  const latestPayment   = paymentHistory.at(-1) || order.lastPayment;
  const totalSaleAmount = Number(latestPayment?.totalAmount) || 0;
  const currentDue      = Number(latestPayment?.dueAmount)   || 0;
  const totalReceived   = paymentHistory.reduce(
    (s, p) => s + (Number(p.finalAmount) || Number(p.receivedAmount) || 0), 0
  );
  const progressPct = totalSaleAmount > 0
    ? Math.min(100, Math.round((totalReceived / totalSaleAmount) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0d0f1e", border: "1px solid rgba(249,115,22,0.25)" }}>
      <div className="p-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-white font-black text-base">{order.customer.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)" }}>
                💳 Due
              </span>
            </div>
            <a href={`tel:${order.customer.phone}`} className="text-blue-400 font-mono text-sm">
              📞 {order.customer.phone}
            </a>
            {latestPayment?.completedDate && (
              <p className="text-gray-600 text-xs mt-0.5">
                Last payment: {fmtDate(latestPayment.completedDate)}
              </p>
            )}
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={onPay}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl font-black text-sm text-white"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", boxShadow: "0 4px 15px rgba(249,115,22,0.35)" }}>
            💳 Pay Due
          </motion.button>
        </div>

        {/* Amount breakdown */}
        <div className="rounded-xl p-3 mb-3"
          style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
          {totalSaleAmount > 0 && (
            <>
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Total Order</p>
                <p className="text-white font-black">{fmtAmt(totalSaleAmount)}</p>
              </div>
              <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden mb-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-2 rounded-full"
                  style={{ background: "linear-gradient(90deg,#3b82f6,#2563eb)" }}
                />
              </div>
              <div className="flex justify-between text-[10px] mb-2">
                <span className="text-blue-400">{progressPct}% paid</span>
                <span className="text-orange-400">{100 - progressPct}% due</span>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p className="text-[10px] text-gray-500">✅ Received</p>
              <p className="text-green-400 font-black text-base">{fmtAmt(totalReceived)}</p>
              {paymentHistory.length > 1 && (
                <p className="text-[10px] text-gray-500">{paymentHistory.length} payments</p>
              )}
            </div>
            <div className="rounded-lg px-3 py-2"
              style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)" }}>
              <p className="text-[10px] text-gray-500">⏳ Due</p>
              <p className="text-orange-400 font-black text-base">{fmtAmt(currentDue)}</p>
            </div>
          </div>
        </div>

        {/* History toggle */}
        {paymentHistory.length > 0 && (
          <>
            <button onClick={() => setShowHistory(p => !p)}
              className="w-full py-1.5 rounded-xl text-xs font-bold text-orange-400
                         hover:bg-orange-500/10 transition flex items-center justify-center gap-1.5"
              style={{ border: "1px solid rgba(249,115,22,0.15)" }}>
              {showHistory ? "▲ Hide" : "▼ Payment History"}
              <span className="bg-orange-500/15 px-1.5 py-0.5 rounded-full text-[9px]">
                {paymentHistory.length}
              </span>
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
                  <div className="space-y-1.5">
                    {paymentHistory.map((p, i) => {
                      const rec    = Number(p.finalAmount) || Number(p.receivedAmount) || 0;
                      const due    = Number(p.dueAmount) || 0;
                      const isLast = i === paymentHistory.length - 1;
                      return (
                        <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                          style={{ background: isLast ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)", border: isLast ? "1px solid rgba(249,115,22,0.15)" : "1px solid rgba(255,255,255,0.05)" }}>
                          <div>
                            <p className="text-[10px] text-gray-500">
                              {p.completedDate ? fmtDate(p.completedDate) : `Payment ${i + 1}`}
                              {isLast && <span className="ml-1.5 text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">LATEST</span>}
                            </p>
                            {due > 0 && <p className="text-[10px] text-orange-400/70">Due: {fmtAmt(due)}</p>}
                          </div>
                          <p className="text-green-400 font-black text-sm">+{fmtAmt(rec)}</p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Due Payment Modal ────────────────────────────────────────────
function DuePaymentModal({ order, onClose, onSuccess, showToast }) {
  const [amount,     setAmount]     = useState("");
  const [date,       setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [waLink,     setWaLink]     = useState(null); // ✅ FIX 31: success pe WA link store

  const paymentHistory  = order.paymentHistory || [];
  const latestPayment   = paymentHistory.at(-1) || order.lastPayment;
  const currentDue      = Number(latestPayment?.dueAmount) || 0;
  const totalSale       = Number(latestPayment?.totalAmount) || 0;
  const totalReceived   = paymentHistory.reduce(
    (s, p) => s + (Number(p.finalAmount) || Number(p.receivedAmount) || 0), 0
  );

  const amountNum    = Number(amount) || 0;
  const newDue       = Math.max(0, currentDue - amountNum);
  const willComplete = amountNum >= currentDue && amountNum > 0;
  const isPartial    = amountNum > 0 && amountNum < currentDue;

  const handleSubmit = async () => {
    if (!amountNum || amountNum <= 0) {
      showToast("Amount daalo", "error"); return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.patch("/orders/due-payment", {
        orderGroupId:   order.id,
        receivedAmount: amountNum,
        paymentDate:    date,
      });
      if (data.success) {
        showToast(data.message);

        // ✅ FIX 31: WA link banao success pe
        const newTotalReceived = totalReceived + amountNum;
        const newDueAfter      = Math.max(0, currentDue - amountNum);
        const link = buildWALink(
          order.customer.phone,
          buildDuePaymentMessage({
            customer:        order.customer,
            received:        amountNum,
            newDue:          newDueAfter,
            totalSaleAmount: totalSale,
            totalReceived:   newTotalReceived,
          })
        );
        setWaLink(link);

        // onSuccess thoda delay se call karo taaki WA button dikh sake
        setTimeout(() => onSuccess(data.movedToCompleted), 2500);
      }
    } catch (err) {
      showToast(err?.response?.data?.error || "Payment nahi hua", "error");
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-[9998]"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} />

      <div className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col rounded-t-3xl overflow-hidden"
        style={{ background: "#0d0f1e", border: "1px solid rgba(249,115,22,0.2)", borderBottom: "none", maxHeight: "85dvh" }}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="px-5 pt-2 pb-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h2 className="text-lg font-black text-white">💳 Due Payment</h2>
            <p className="text-xs text-orange-400 mt-0.5">
              {order.customer.name} • Due: {fmtAmt(currentDue)}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Current status */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Current Status</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Total Order</p>
                <p className="text-white font-black text-sm">{fmtAmt(totalSale)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-1">✅ Mila</p>
                <p className="text-green-400 font-black text-sm">{fmtAmt(totalReceived)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-1">⏳ Due</p>
                <p className="text-orange-400 font-black text-sm">{fmtAmt(currentDue)}</p>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
              📅 Payment Date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0c0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/12 transition" />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
              💰 Amount Received (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-black text-lg">₹</span>
              <input type="text" inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={`Due: ${currentDue.toLocaleString("en-IN")}`}
                autoFocus
                className="w-full bg-[#0c0e1a] border border-white/10 rounded-xl pl-9 pr-4 py-4 text-white text-xl font-black outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/12 transition" />
            </div>
            {/* Quick buttons */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[0.25, 0.5, 0.75, 1].map((mult, i) => {
                const v = Math.round(currentDue * mult);
                if (v <= 0) return null;
                return (
                  <button key={i} onClick={() => setAmount(String(v))}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold transition"
                    style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#fb923c" }}>
                    {mult === 1 ? `Full ${fmtAmt(v)}` : fmtAmt(v)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <AnimatePresence>
            {amountNum > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {willComplete ? (
                  <div className="rounded-2xl px-4 py-3.5"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🎉</span>
                      <p className="text-green-400 font-black">Order COMPLETE ho jaayega!</p>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Total received: {fmtAmt(totalReceived + amountNum)}
                      {amountNum > currentDue && (
                        <span className="text-blue-400 ml-2">(₹{(amountNum - currentDue).toLocaleString("en-IN")} extra — theek hai)</span>
                      )}
                    </p>
                  </div>
                ) : isPartial ? (
                  <div className="rounded-2xl px-4 py-3.5"
                    style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}>
                    <p className="text-orange-400 font-bold text-sm mb-1">⏳ Partial Payment</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Naya due:</span>
                      <span className="text-orange-400 font-black">{fmtAmt(newDue)}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Order Dues mein rahega</p>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 flex flex-col gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#0d0f1e" }}>

          {/* ✅ FIX 31: WA button — payment save hone ke baad dikhta hai */}
          <AnimatePresence>
            {waLink && (
              <motion.a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
                className="w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                style={{
                  background: "rgba(37,211,102,0.12)",
                  border:     "1px solid rgba(37,211,102,0.35)",
                  color:      "#25d366",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.859L.057 23.882a.5.5 0 0 0 .061.47.5.5 0 0 0 .453.148l6.228-1.636A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.373l-.359-.214-3.717.977.992-3.63-.234-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                </svg>
                Customer ko WhatsApp karo
              </motion.a>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl text-gray-300 text-xl"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>✕</button>
            <button onClick={handleSubmit}
              disabled={submitting || !amountNum || amountNum <= 0 || !!waLink}
              className="flex-1 h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 transition relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: willComplete ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#f97316,#ea580c)",
                boxShadow:  willComplete ? "0 4px 20px rgba(22,163,74,0.4)"          : "0 4px 20px rgba(249,115,22,0.4)",
              }}>
              {!submitting && !waLink && (
                <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 pointer-events-none" />
              )}
              {submitting
                ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                : waLink ? "✅ Payment Saved!"
                : willComplete ? "✅ Complete Karo" : "💳 Partial Save Karo"}
            </button>
          </div>
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
        style={{ color: "rgba(249,115,22,0.6)" }}>
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(p => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-black transition-all disabled:opacity-25"
          style={{ background: "rgba(12,14,26,1)", border: "1px solid rgba(249,115,22,0.15)", color: "#6b7280" }}
        >
          ← Prev
        </motion.button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-xs font-black"
                style={{ color: "rgba(249,115,22,0.3)" }}>···</span>
            ) : (
              <motion.button key={p} whileTap={{ scale: 0.85 }} onClick={() => onPageChange(p)}
                className="w-9 h-9 rounded-xl text-sm font-black transition-all"
                style={{
                  background: currentPage === p ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(12,14,26,1)",
                  border: `1px solid ${currentPage === p ? "rgba(249,115,22,0.7)" : "rgba(249,115,22,0.15)"}`,
                  color: currentPage === p ? "#fff" : "#6b7280",
                  boxShadow: currentPage === p ? "0 4px 16px rgba(249,115,22,0.35)" : "none",
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
          style={{ background: "rgba(12,14,26,1)", border: "1px solid rgba(249,115,22,0.15)", color: "#6b7280" }}
        >
          Next →
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main DuesTab Export ──────────────────────────────────────────
export default function DuesTab({ orders, onRefresh, showToast }) {
  const [payModal,    setPayModal]    = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search,      setSearch]      = useState("");

  const dueOrders      = orders.filter(o => o.status === "Partially Completed");
  const totalDueAmount = dueOrders.reduce((sum, o) => {
    const last = (o.paymentHistory || []).at(-1) || o.lastPayment;
    return sum + (Number(last?.dueAmount) || 0);
  }, 0);

  // ─── Search filter: name, phone, last payment date ────────────
  const filtered = dueOrders.filter(o => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name  = (o.customer?.name  || "").toLowerCase();
    const phone = (o.customer?.phone || "").toLowerCase();
    const hist  = o.paymentHistory || [];
    const last  = hist.at(-1) || o.lastPayment;
    const date  = last?.completedDate ? fmtDate(last.completedDate).toLowerCase() : "";
    return name.includes(q) || phone.includes(q) || date.includes(q);
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

  if (dueOrders.length === 0) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p className="text-5xl mb-4">🎉</p>
        <p className="text-base font-semibold">Koi due nahi!</p>
        <p className="text-sm mt-1">Sab payments clear hain</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Summary banner */}
      <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)" }}>
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold">Total Outstanding Due</p>
          <p className="text-orange-400 font-black text-xl mt-0.5">{fmtAmt(totalDueAmount)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">{dueOrders.length} orders</p>
          <p className="text-orange-400/60 text-xl">⏳</p>
        </div>
      </div>

      {/* ─── Search bar ─────────────────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: "rgba(249,115,22,0.5)" }}>🔍</span>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Name, phone ya payment date se search karo..."
          className="w-full rounded-xl pl-9 pr-10 py-3 text-white text-sm outline-none transition"
          style={{ background: "#0c0e1a", border: "1px solid rgba(249,115,22,0.2)" }}
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
          style={{ color: "rgba(249,115,22,0.6)" }}>
          {filtered.length} {search ? "Results" : "Due Orders"}
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
            style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#fb923c" }}
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
              <DueCard key={order.id} order={order} onPay={() => setPayModal(order)} />
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

      {/* Due Payment Modal */}
      <AnimatePresence>
        {payModal && (
          <DuePaymentModal
            order={payModal}
            onClose={() => setPayModal(null)}
            onSuccess={(movedToCompleted) => {
              setPayModal(null);
              onRefresh(movedToCompleted);
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}