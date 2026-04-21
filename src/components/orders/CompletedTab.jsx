"use client";
// src/components/orders/CompletedTab.jsx
// Sirf completed orders — read only view

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fmtDate, fmtAmt, groupOrders } from "./orderUtils";
import { buildWALink, buildCompletedMessage } from "./whatsappUtils"; // ✅ FIX 31

const ITEMS_PER_PAGE = 3;

function CompletedCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const groups  = groupOrders(order.orders);
  const payment = order.payment;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0d0f1e", border: "1px solid rgba(16,185,129,0.15)" }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-white font-black text-base">{order.customer.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
                ✓ Complete
              </span>
            </div>
            <a href={`tel:${order.customer.phone}`} className="text-blue-400 font-mono text-sm">
              📞 {order.customer.phone}
            </a>
            {payment?.completedDate && (
              <p className="text-gray-600 text-xs mt-0.5">✅ {fmtDate(payment.completedDate)}</p>
            )}

            {/* ✅ FIX 31: WhatsApp Receipt Button */}
            {(() => {
              const waLink = buildWALink(
                order.customer.phone,
                buildCompletedMessage({
                  customer: order.customer,
                  payment,
                  orders:   order.orders || [],
                })
              );
              return waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:opacity-80"
                  style={{
                    background: "rgba(37,211,102,0.10)",
                    border:     "1px solid rgba(37,211,102,0.28)",
                    color:      "#25d366",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#25d366" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.859L.057 23.882a.5.5 0 0 0 .061.47.5.5 0 0 0 .453.148l6.228-1.636A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.373l-.359-.214-3.717.977.992-3.63-.234-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                  </svg>
                  WhatsApp Receipt
                </a>
              ) : null;
            })()}
          </div>
          <button onClick={() => setExpanded(p => !p)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {expanded ? "▲" : "▼ Details"}
          </button>
        </div>

        {/* Payment summary */}
        {payment?.totalAmount && (
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-0 rounded-xl px-3 py-2 text-center"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="text-[10px] text-gray-500">Total</p>
              <p className="text-green-400 font-black">{fmtAmt(payment.totalAmount)}</p>
            </div>
            <div className="flex-1 min-w-0 rounded-xl px-3 py-2 text-center"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] text-gray-500">Mila</p>
              <p className="text-blue-400 font-black">
                {fmtAmt(payment.finalAmount || payment.receivedAmount)}
              </p>
            </div>
            {payment.grossProfit !== undefined && (
              <div className="flex-1 min-w-0 rounded-xl px-3 py-2 text-center"
                style={payment.grossProfit >= 0
                  ? { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }
                  : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-[10px] text-gray-500">Profit</p>
                <p className={`font-black ${payment.grossProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmtAmt(payment.grossProfit)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="p-4 space-y-3">

              {/* Order items */}
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">📦 Orders</p>
                {groups.map(([type, items]) => (
                  <div key={type} className="mb-2">
                    <p className="text-amber-400 text-xs font-black mb-1 uppercase">{type}</p>
                    <div className="space-y-1">
                      {items.map((o, i) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap rounded-xl px-3 py-2"
                          style={{ background: "rgba(255,255,255,0.02)" }}>
                          <span className="text-gray-600 text-xs">{i + 1}.</span>
                          <span className="text-gray-300 font-mono text-sm">{o.height ?? "—"} × {o.width ?? "—"} ft</span>
                          {o.metalType && <span className="text-gray-500 text-xs ml-auto">{o.metalType}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Material usage */}
              {payment?.materialUsage?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">⚙️ Material Used</p>
                  <div className="flex gap-2 flex-wrap">
                    {payment.materialUsage.map((m, i) => (
                      <div key={i} className="rounded-xl px-3 py-2"
                        style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                        <p className="text-blue-400 font-bold text-xs">{m.metalType}</p>
                        <p className="text-gray-300 text-sm">{m.kgUsed} kg</p>
                        <p className="text-gray-600 text-xs">Cost: {fmtAmt(m.materialCost)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment history */}
              {payment?.paymentHistory?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">
                    💳 Payment History ({payment.paymentHistory.length} payments)
                  </p>
                  <div className="space-y-1.5">
                    {payment.paymentHistory.map((p, i) => {
                      const rec = Number(p.finalAmount) || Number(p.receivedAmount) || 0;
                      return (
                        <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <p className="text-[11px] text-gray-500">
                            {p.completedDate ? fmtDate(p.completedDate) : `Payment ${i + 1}`}
                          </p>
                          <p className="text-green-400 font-bold text-sm">+{fmtAmt(rec)}</p>
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
      {/* Page info */}
      <p className="text-[10px] font-black uppercase tracking-[0.18em]"
        style={{ color: "rgba(16,185,129,0.6)" }}>
        Page {currentPage} of {totalPages}
      </p>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">

        {/* Prev */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(p => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-black transition-all disabled:opacity-25"
          style={{
            background: "rgba(12,14,26,1)",
            border: "1px solid rgba(16,185,129,0.2)",
            color: "#6b7280",
          }}
        >
          ← Prev
        </motion.button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span
                key={`dots-${i}`}
                className="w-9 h-9 flex items-center justify-center text-xs font-black"
                style={{ color: "rgba(16,185,129,0.3)" }}
              >
                ···
              </span>
            ) : (
              <motion.button
                key={p}
                whileTap={{ scale: 0.85 }}
                onClick={() => onPageChange(p)}
                className="w-9 h-9 rounded-xl text-sm font-black transition-all"
                style={{
                  background: currentPage === p
                    ? "linear-gradient(135deg,#10b981,#059669)"
                    : "rgba(12,14,26,1)",
                  border: `1px solid ${currentPage === p
                    ? "rgba(16,185,129,0.7)"
                    : "rgba(16,185,129,0.2)"}`,
                  color: currentPage === p ? "#fff" : "#6b7280",
                  boxShadow: currentPage === p
                    ? "0 4px 16px rgba(16,185,129,0.3)"
                    : "none",
                }}
              >
                {p}
              </motion.button>
            )
          )}
        </div>

        {/* Next */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onPageChange(p => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-black transition-all disabled:opacity-25"
          style={{
            background: "rgba(12,14,26,1)",
            border: "1px solid rgba(16,185,129,0.2)",
            color: "#6b7280",
          }}
        >
          Next →
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main CompletedTab Export ─────────────────────────────────────
export default function CompletedTab({ orders }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search,      setSearch]      = useState("");

  // Filter by name, phone, or date
  const filtered = orders.filter(o => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name  = (o.customer?.name  || "").toLowerCase();
    const phone = (o.customer?.phone || "").toLowerCase();
    const date  = o.payment?.completedDate
      ? fmtDate(o.payment.completedDate).toLowerCase()
      : "";
    return name.includes(q) || phone.includes(q) || date.includes(q);
  });

  const totalPages  = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated   = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalAmount = orders.reduce(
    (s, o) => s + (Number(o.payment?.totalAmount) || 0), 0
  );

  const handleSearch = (val) => {
    setSearch(val);
    setCurrentPage(1); // reset to page 1 on search
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p className="text-5xl mb-4">📦</p>
        <p className="text-base font-semibold">Koi completed order nahi</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Summary banner */}
      <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold">Total Completed</p>
          <p className="text-green-400 font-black text-xl mt-0.5">{fmtAmt(totalAmount)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">{orders.length} orders</p>
          <p className="text-green-400/60 text-xl">✅</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: "rgba(16,185,129,0.5)" }}>🔍</span>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Name, phone ya date se search karo..."
          className="w-full rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none transition"
          style={{
            background: "#0c0e1a",
            border: "1px solid rgba(16,185,129,0.2)",
            color: "#fff",
          }}
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
          style={{ color: "rgba(16,185,129,0.6)" }}>
          {filtered.length} {search ? "Results" : "Completed Orders"}
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
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-14"
        >
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-white font-black">Koi result nahi mila</p>
          <p className="text-gray-600 text-sm mt-1">"{search}" se kuch match nahi hua</p>
          <button
            onClick={() => handleSearch("")}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}
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
              <CompletedCard key={order.id} order={order} />
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
    </div>
  );
}