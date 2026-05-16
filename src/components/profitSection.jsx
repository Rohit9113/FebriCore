"use client";
// src/components/profitSection.jsx
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ─── API ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");
  if (token) cfg.headers.Authorization  = `Bearer ${token}`;
  if (role)  cfg.headers["x-user-role"] = role;
  return cfg;
});

// ─── Helpers ──────────────────────────────────────────────────────
const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtShort = (n) => {
  const abs  = Math.abs(n || 0);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
};
const fmtPct = (n) => {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n}%`;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
// ✅ FIX 8: years options for yearly view
const YEARS_OPTIONS = [3, 5, 7, 10];

const C = {
  income:    "#f59e0b",
  goods:     "#ef4444",
  expenses:  "#f97316",
  salaries:  "#8b5cf6",
  profit:    "#10b981",
  loss:      "#ef4444",
  received:  "#3b82f6",
  due:       "#f97316",
  repairing: "#a855f7",
};
const PIE_COLORS = [C.goods, C.expenses, C.salaries];

// ─── Skeleton ─────────────────────────────────────────────────────
const SK = ({ cls = "" }) => (
  <div className={`bg-white/[0.04] rounded-2xl animate-pulse ${cls}`} />
);

// ─── Custom Tooltip ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs max-w-[200px]">
      <p className="text-white font-bold mb-1.5 truncate">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-[#8b9ab8] truncate">{p.name}:</span>
          <span className={`font-bold ml-1 ${p.value < 0 ? "text-red-400" : "text-white"}`}>
            {fmtShort(p.value || 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────
function SummaryCard({ icon, label, value, accent, sub, subColor, delay = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 280, damping: 26 }}
      onClick={onClick}
      className={`rounded-2xl p-3.5 sm:p-4 ${onClick ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""}`}
      style={{ background: `${accent}0d`, border: `1px solid ${accent}25` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          {icon}
        </div>
        {sub && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg flex-shrink-0"
            style={{ color: subColor || "#3d4260", background: "rgba(255,255,255,0.04)" }}>
            {sub}
          </span>
        )}
      </div>
      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-2.5 mb-1"
        style={{ color: `${accent}99` }}>
        {label}
      </p>
      <p className="font-black text-base sm:text-lg leading-tight break-all" style={{ color: accent }}>
        {value}
      </p>
    </motion.div>
  );
}

// ─── ✅ FIX 9: Period Detail Modal ────────────────────────────────
function PeriodDetailModal({ row, onClose }) {
  if (!row) return null;
  const items = [
    { label: "Total Income",    value: row.income,    color: C.income,    icon: "💰" },
    { label: "Order Income",    value: row.orderIncome || (row.income - (row.repairingIncome || 0)), color: C.income, icon: "📦" },
    { label: "Repairing Income",value: row.repairingIncome || 0, color: C.repairing, icon: "🔧" },
    { label: "Material Cost",   value: row.goods,     color: C.goods,     icon: "🏗️" },
    { label: "Expenses",        value: row.expenses,  color: C.expenses,  icon: "🧾" },
    { label: "Salaries",        value: row.salaries,  color: C.salaries,  icon: "👥" },
    { label: "Total Cost",      value: row.cost,      color: "#64748b",   icon: "📊" },
    { label: "Received",        value: row.received || 0, color: C.received, icon: "✅" },
    { label: "Due Baaki",       value: row.due || 0,  color: C.due,       icon: "⏳" },
  ];
  const isProfit = row.profit >= 0;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()}
          className="bg-[#0f1117] border border-white/15 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between"
            style={{ background: isProfit ? "#10b98110" : "#ef444410" }}>
            <div>
              <p className="text-white font-black text-lg">{row.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                {isProfit ? "✓ Profit" : "✗ Loss"}: {isProfit ? "+" : ""}{fmtAmt(row.profit)}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
          </div>
          {/* Items */}
          <div className="p-5 space-y-2.5">
            {items.map((item) => item.value > 0 && (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-gray-400 text-sm">{item.label}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: item.color }}>{fmtAmt(item.value)}</span>
              </div>
            ))}
            {/* Margin */}
            {row.income > 0 && (
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-gray-400 text-sm">Profit Margin</span>
                <span className={`font-black text-sm ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                  {row.income > 0 ? `${((row.profit / row.income) * 100).toFixed(1)}%` : "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Period Table ─────────────────────────────────────────────────
function PeriodTable({ rows, summary: s, onRowClick }) {
  return (
    <div>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Period", "Income", "Cost", "Profit/Loss", "Received", "Due", "Status"].map(h => (
                <th key={h} className="text-left py-2.5 pr-3 font-black uppercase tracking-wider text-[#3d4260] text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} onClick={() => row.income > 0 && onRowClick(row)}
                className={`transition-colors ${row.income > 0 ? "hover:bg-white/[0.03] cursor-pointer" : ""}`}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="py-3 pr-3 text-white font-semibold">{row.label}</td>
                <td className="py-3 pr-3 text-amber-400 font-bold">{row.income > 0 ? fmtShort(row.income) : "—"}</td>
                <td className="py-3 pr-3 text-red-400">{row.cost > 0 ? fmtShort(row.cost) : "—"}</td>
                {/* ✅ FIX 4: signed profit */}
                <td className={`py-3 pr-3 font-black ${row.profit > 0 ? "text-emerald-400" : row.profit < 0 ? "text-red-400" : "text-[#3d4260]"}`}>
                  {row.profit !== 0 ? `${row.profit > 0 ? "+" : ""}${fmtShort(row.profit)}` : "—"}
                </td>
                {/* ✅ FIX 5: received + due */}
                <td className="py-3 pr-3 text-blue-400">{row.received > 0 ? fmtShort(row.received) : "—"}</td>
                <td className={`py-3 pr-3 font-semibold ${row.due > 0 ? "text-orange-400" : "text-[#3d4260]"}`}>{row.due > 0 ? fmtShort(row.due) : "—"}</td>
                <td className="py-3">
                  {row.income === 0 && row.cost === 0 ? (
                    <span className="text-[#3d4260]">—</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: row.profit >= 0 ? "#10b98115" : "#ef444415", color: row.profit >= 0 ? "#10b981" : "#ef4444", border: `1px solid ${row.profit >= 0 ? "#10b98130" : "#ef444430"}` }}>
                      {row.profit >= 0 ? "✓ Profit" : "✗ Loss"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)" }}>
              <td className="py-3 text-[#6b7a99] font-black text-xs uppercase">Total</td>
              <td className="py-3 text-amber-400 font-black">{fmtShort(s.totalIncome)}</td>
              <td className="py-3 text-red-400 font-black">{fmtShort(s.totalCost)}</td>
              <td className={`py-3 font-black text-sm ${s.isProfit ? "text-emerald-400" : "text-red-400"}`}>{s.isProfit ? "+" : ""}{fmtShort(s.totalProfit)}</td>
              <td className="py-3 text-blue-400 font-black">{fmtShort(s.totalReceived || 0)}</td>
              <td className={`py-3 font-black ${s.totalDue > 0 ? "text-orange-400" : "text-[#3d4260]"}`}>{s.totalDue > 0 ? fmtShort(s.totalDue) : "—"}</td>
              <td className="py-3">
                <span className="px-3 py-1 rounded-full text-xs font-black"
                  style={{ background: s.isProfit ? "#10b98115" : "#ef444415", border: `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}`, color: s.isProfit ? "#10b981" : "#ef4444" }}>
                  {s.isProfit ? "✓ Profit" : "✗ Loss"}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((row, i) => {
          if (row.income === 0 && row.cost === 0) return null;
          const isProfit = row.profit >= 0;
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => onRowClick(row)}
              className="rounded-2xl p-3.5 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-black text-sm">{row.label}</p>
                <span className="text-[9px] px-2 py-1 rounded-xl font-black"
                  style={{ background: isProfit ? "#10b98115" : "#ef444415", color: isProfit ? "#10b981" : "#ef4444" }}>
                  {isProfit ? "+" : ""}{fmtShort(row.profit)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div><p className="text-[9px] text-[#3d4260] uppercase font-bold">Income</p><p className="text-amber-400 font-bold text-xs mt-0.5">{row.income > 0 ? fmtShort(row.income) : "—"}</p></div>
                <div><p className="text-[9px] text-[#3d4260] uppercase font-bold">Cost</p><p className="text-red-400 text-xs mt-0.5">{row.cost > 0 ? fmtShort(row.cost) : "—"}</p></div>
                <div><p className="text-[9px] text-[#3d4260] uppercase font-bold">Rec'd</p><p className="text-blue-400 text-xs mt-0.5">{row.received > 0 ? fmtShort(row.received) : "—"}</p></div>
                <div><p className="text-[9px] text-[#3d4260] uppercase font-bold">Due</p><p className={`text-xs mt-0.5 font-semibold ${row.due > 0 ? "text-orange-400" : "text-[#3d4260]"}`}>{row.due > 0 ? fmtShort(row.due) : "—"}</p></div>
              </div>
              <p className="text-[10px] text-[#3d4260] mt-2 text-right">Tap for details →</p>
            </motion.div>
          );
        })}
        {/* Mobile total */}
        <div className="rounded-2xl p-3.5 mt-2"
          style={{ background: s.isProfit ? "#10b98110" : "#ef444410", border: `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}` }}>
          <div className="flex justify-between items-center">
            <p className="text-white font-black text-sm">Total</p>
            <p className={`font-black text-lg ${s.isProfit ? "text-emerald-400" : "text-red-400"}`}>{s.isProfit ? "+" : ""}{fmtShort(s.totalProfit)}</p>
          </div>
          <div className="flex gap-4 mt-1.5 text-xs flex-wrap">
            <span className="text-amber-400">In: {fmtShort(s.totalIncome)}</span>
            <span className="text-red-400">Cost: {fmtShort(s.totalCost)}</span>
            <span className="text-blue-400">Rec: {fmtShort(s.totalReceived || 0)}</span>
            {s.totalDue > 0 && <span className="text-orange-400">Due: {fmtShort(s.totalDue)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function ProfitSection() {
  const [view,         setView]         = useState("monthly");
  const [year,         setYear]         = useState(CURRENT_YEAR);
  const [yearsCount,   setYearsCount]   = useState(5);
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [activeChart,  setActiveChart]  = useState("profit");
  const [detailRow,    setDetailRow]    = useState(null);

  const fetchProfit = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = view === "monthly"
        ? { view: "monthly", year }
        : { view: "yearly", years: yearsCount };
      const { data: res } = await api.get("/dashboard/profit", { params });
      if (res.success) setData(res.data);
      else setError(res.error || "Data load nahi hua");
    } catch (err) {
      setError(err?.response?.data?.error || "Server error");
    } finally { setLoading(false); }
  }, [view, year, yearsCount]);

  useEffect(() => { fetchProfit(); }, [fetchProfit]);

  const rows = data?.labels?.map((label, i) => ({
    label,
    income:          Math.round(data.income[i]          || 0),
    goods:           Math.round(data.goods[i]           || 0),
    expenses:        Math.round(data.expenses[i]        || 0),
    salaries:        Math.round(data.salaries[i]        || 0),
    cost:            Math.round(data.totalCost[i]       || 0),
    profit:          Math.round(data.profit[i]          || 0),
    received:        Math.round(data.received?.[i]      || 0), 
    due:             Math.round(data.due?.[i]           || 0),
    repairingIncome: Math.round(data.repairingIncome?.[i] || 0),
    orderIncome:     Math.round(data.orderIncome?.[i]   || 0),
  })) || [];

  const s    = data?.summary;
  const cb   = data?.costBreakdown;
  const dq   = data?.dataQuality;
  const si   = data?.stockInfo;

  const pieData = s ? [
    { name: "Goods",    value: Math.round(s.totalGoods)    },
    { name: "Expenses", value: Math.round(s.totalExpenses) },
    { name: "Salaries", value: Math.round(s.totalSalaries) },
  ] : [];

  return (
    <div className="px-4 sm:px-5 lg:px-6 pb-6 pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* View toggle */}
        <div className="flex rounded-2xl p-1 gap-1 flex-shrink-0"
          style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
          {[{ key: "monthly", label: "📅 Monthly" }, { key: "yearly", label: "📆 Yearly" }].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all"
              style={{ background: view === v.key ? "#f59e0b" : "transparent", color: view === v.key ? "#000" : "#6b7a99", boxShadow: view === v.key ? "0 4px 12px #f59e0b30" : "none" }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Year selector (monthly) */}
        <AnimatePresence>
          {view === "monthly" && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }}
              className="flex rounded-2xl p-1 gap-1 overflow-hidden"
              style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
              {YEAR_OPTIONS.map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                  style={{ background: year === y ? "#f59e0b18" : "transparent", border: year === y ? "1px solid #f59e0b30" : "1px solid transparent", color: year === y ? "#f59e0b" : "#6b7a99" }}>
                  {y}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {view === "yearly" && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }}
              className="flex rounded-2xl p-1 gap-1 overflow-hidden"
              style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
              {YEARS_OPTIONS.map(y => (
                <button key={y} onClick={() => setYearsCount(y)}
                  className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                  style={{ background: yearsCount === y ? "#f59e0b18" : "transparent", border: yearsCount === y ? "1px solid #f59e0b30" : "1px solid transparent", color: yearsCount === y ? "#f59e0b" : "#6b7a99" }}>
                  {y}Y
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button whileTap={{ scale: 0.88, rotate: 180 }} onClick={fetchProfit} transition={{ duration: 0.3 }}
          className="w-9 h-9 flex items-center justify-center rounded-xl ml-auto flex-shrink-0"
          style={{ background: "#0c0e1a", border: "1px solid #1e2235", color: "#4a5580" }}>
          🔄
        </motion.button>
      </div>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <SK cls="h-36 sm:h-44" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><SK cls="h-24" /><SK cls="h-24" /><SK cls="h-24" /><SK cls="h-24" /></div>
          <SK cls="h-56 sm:h-64" />
          <SK cls="h-48 sm:h-56" />
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="rounded-2xl px-4 py-4 text-red-400 text-sm text-center mb-4"
          style={{ background: "#ef444410", border: "1px solid #ef444425" }}>
          ⚠️ {error}
          <button onClick={fetchProfit} className="ml-3 underline text-red-300 hover:text-red-200">Retry</button>
        </div>
      )}

      {/* ═══════════════ DATA LOADED ═══════════════ */}
      {!loading && !error && data && s && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <AnimatePresence>
            {dq?.hasLegacyData && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl px-4 py-3 flex items-start gap-3"
                style={{ background: "#f59e0b0d", border: "1px solid #f59e0b30" }}>
                <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
                <div>
                  <p className="text-amber-400 font-bold text-sm">Purana Data Warning</p>
                  <p className="text-[#6b7a99] text-xs mt-0.5">{dq.warning}</p>
                  <p className="text-[#4a5580] text-[11px] mt-1">
                    Legacy income: {fmtAmt(dq.legacyIncome)} — In orders ka material cost 0 maana gaya hai
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Hero P&L Card ──────────────────────────────────────── */}
          <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${s.isProfit ? "#10b98118" : "#ef444418"} 0%, #0c0e1a 60%)`, border: `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}` }}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: s.isProfit ? "#10b98115" : "#ef444415" }} />

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
                  style={{ color: s.isProfit ? "#10b98180" : "#ef444480" }}>
                  {view === "monthly" ? `Net ${s.isProfit ? "Profit" : "Loss"} — ${year}` : `Net ${s.isProfit ? "Profit" : "Loss"}`}
                </p>
                <p className="font-black leading-none"
                  style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(1.8rem, 6vw, 3rem)", color: s.isProfit ? "#10b981" : "#ef4444" }}>
                  {s.isProfit ? "+" : ""}{fmtAmt(s.totalProfit)}
                </p>
                <p className="text-[#4a5170] text-xs mt-2 leading-relaxed">
                  Margin: <span className="font-bold" style={{ color: s.isProfit ? "#10b981" : "#ef4444" }}>
                    {s.profitMargin}%
                  </span>
                  {" · "}In {fmtShort(s.totalIncome)} − Cost {fmtShort(s.totalCost)}
                </p>
                {/* Received vs Due */}
                {(s.totalReceived > 0 || s.totalDue > 0) && (
                  <div className="flex gap-4 mt-2">
                    {s.totalReceived > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-[11px] text-blue-400 font-semibold">Received: {fmtShort(s.totalReceived)}</span>
                      </div>
                    )}
                    {s.totalDue > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                        <span className="text-[11px] text-orange-400 font-semibold">Due: {fmtShort(s.totalDue)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <motion.div animate={{ rotate: [0, s.isProfit ? 5 : -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0"
                style={{ background: s.isProfit ? "#10b98115" : "#ef444415", border: `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}` }}>
                {s.isProfit ? "✅" : "📉"}
              </motion.div>
            </div>

            {/* Margin bar */}
            <div className="mt-4 relative z-10">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#4a5170]">Profit Margin</span>
                <span className="font-bold" style={{ color: s.isProfit ? "#10b981" : "#ef4444" }}>{s.profitMargin}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.abs(s.profitMargin), 100)}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  className="h-full rounded-full relative overflow-hidden"
                  style={{ background: s.isProfit ? "#10b981" : "#ef4444" }}>
                  <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ── 4 Summary Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon="💰" label="Total Income"  value={fmtShort(s.totalIncome)}   accent={C.income}   sub={view === "monthly" ? `${year}` : `${yearsCount}Y`} delay={0.05} />
            <SummaryCard icon="📦" label="Goods Cost"    value={fmtShort(s.totalGoods)}    accent={C.goods}    sub={`${cb.goodsPct}%`}    delay={0.1}  />
            <SummaryCard icon="🧾" label="Expenses"      value={fmtShort(s.totalExpenses)} accent={C.expenses} sub={`${cb.expensesPct}%`} delay={0.15} />
            <SummaryCard icon="👥" label="Salaries"      value={fmtShort(s.totalSalaries)} accent={C.salaries} sub={`${cb.salariesPct}%`} delay={0.2}  />
          </div>

          {(s.totalOrderIncome > 0 || s.totalRepairingIncome > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "#f59e0b0d", border: "1px solid #f59e0b25" }}>
                <p className="text-[10px] text-[#6b7a99] font-black uppercase tracking-wider mb-1">📦 Order Income</p>
                <p className="text-amber-400 font-black text-xl">{fmtShort(s.totalOrderIncome)}</p>
                {s.totalIncome > 0 && <p className="text-[11px] text-[#4a5580] mt-1">{((s.totalOrderIncome / s.totalIncome) * 100).toFixed(1)}% of total</p>}
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#a855f70d", border: "1px solid #a855f725" }}>
                <p className="text-[10px] text-[#6b7a99] font-black uppercase tracking-wider mb-1">🔧 Repairing Income</p>
                <p className="text-purple-400 font-black text-xl">{fmtShort(s.totalRepairingIncome)}</p>
                {s.totalIncome > 0 && <p className="text-[11px] text-[#4a5580] mt-1">{((s.totalRepairingIncome / s.totalIncome) * 100).toFixed(1)}% of total</p>}
              </div>
            </div>
          )}

          {view === "monthly" && s.prevYear && s.prevYear.income > 0 && (
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
              <p className="text-white font-bold text-sm mb-0.5">📈 Year-over-Year Comparison</p>
              <p className="text-[#4a5170] text-xs mb-4">{s.prevYear.year} vs {year}</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Income comparison */}
                <div>
                  <p className="text-[10px] text-[#4a5580] uppercase font-bold mb-2">Income</p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] text-[#4a5580] mb-1">{s.prevYear.year}</div>
                      <div className="h-12 rounded-lg flex items-end overflow-hidden" style={{ background: "#1e2235" }}>
                        <div className="w-full rounded-lg" style={{ background: "#f59e0b60", height: "100%" }} />
                      </div>
                      <div className="text-amber-400/70 font-bold text-xs mt-1">{fmtShort(s.prevYear.income)}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-[#4a5580] mb-1">{year}</div>
                      <div className="h-12 rounded-lg flex items-end overflow-hidden" style={{ background: "#1e2235" }}>
                        <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(100, (s.totalIncome / Math.max(s.prevYear.income, s.totalIncome)) * 100)}%` }}
                          transition={{ duration: 0.8 }} className="w-full rounded-lg self-end" style={{ background: "#f59e0b" }} />
                      </div>
                      <div className="text-amber-400 font-bold text-xs mt-1">{fmtShort(s.totalIncome)}</div>
                    </div>
                  </div>
                  {s.prevYear.incomeGrowth !== null && (
                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-lg w-fit ${s.prevYear.incomeGrowth >= 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {fmtPct(s.prevYear.incomeGrowth)} growth
                    </div>
                  )}
                </div>
                {/* Profit comparison */}
                <div>
                  <p className="text-[10px] text-[#4a5580] uppercase font-bold mb-2">Profit</p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] text-[#4a5580] mb-1">{s.prevYear.year}</div>
                      <div className="text-[#6b7a99] font-bold text-xs mt-10">{fmtShort(s.prevYear.profit)}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-[#4a5580] mb-1">{year}</div>
                      <div className={`font-bold text-xs mt-10 ${s.isProfit ? "text-emerald-400" : "text-red-400"}`}>{fmtShort(s.totalProfit)}</div>
                    </div>
                  </div>
                  {s.prevYear.profitGrowth !== null && (
                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-lg w-fit ${s.prevYear.profitGrowth >= 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {fmtPct(s.prevYear.profitGrowth)} growth
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Best / Worst */}
          {(s.bestPeriod || s.worstPeriod) && (
            <div className="grid grid-cols-2 gap-3">
              {s.bestPeriod && (
                <div className="rounded-2xl p-3.5 sm:p-4" style={{ background: "#10b98110", border: "1px solid #10b98122" }}>
                  <p className="text-[9px] sm:text-[10px] text-[#4a5170] font-black uppercase tracking-wider mb-1.5">🏆 Best Period</p>
                  <p className="text-white font-black text-sm sm:text-base">{s.bestPeriod.label}</p>
                  <p className="text-emerald-400 font-black text-sm mt-0.5">+{fmtShort(s.bestPeriod.profit)}</p>
                </div>
              )}
              {s.worstPeriod && s.worstPeriod.label !== s.bestPeriod?.label && (
                <div className="rounded-2xl p-3.5 sm:p-4" style={{ background: "#ef444410", border: "1px solid #ef444422" }}>
                  <p className="text-[9px] sm:text-[10px] text-[#4a5170] font-black uppercase tracking-wider mb-1.5">📉 Worst Period</p>
                  <p className="text-white font-black text-sm sm:text-base">{s.worstPeriod.label}</p>
                  <p className={`font-black text-sm mt-0.5 ${s.worstPeriod.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {s.worstPeriod.profit >= 0 ? "+" : ""}{fmtShort(s.worstPeriod.profit)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chart Selector */}
          <div className="flex rounded-2xl p-1 gap-1" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
            {[
              { key: "profit",   label: "💹 P&L"      },
              { key: "combined", label: "📊 Overview"  },
              { key: "cost",     label: "🏗️ Cost"     },
              { key: "cashflow", label: "💳 Cashflow"  },
            ].map(c => (
              <button key={c.key} onClick={() => setActiveChart(c.key)}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
                style={{ background: activeChart === c.key ? "#f59e0b" : "transparent", color: activeChart === c.key ? "#000" : "#6b7a99", boxShadow: activeChart === c.key ? "0 4px 12px #f59e0b30" : "none" }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Charts */}
          <AnimatePresence mode="wait">
            {/* P&L bars — clickable */}
            {activeChart === "profit" && (
              <motion.div key="profit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
                <p className="text-white font-bold text-sm">💹 Profit / Loss per Period</p>
                <p className="text-[#4a5170] text-xs mt-0.5 mb-4">🟢 Green = Profit · 🔴 Red = Loss · Tap bar for details</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    onClick={(e) => { if (e?.activePayload?.[0]) setDetailRow(rows.find(r => r.label === e.activePayload[0].payload.label)); }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="label" tick={{ fill: "#4a5170", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtShort(v).replace("₹", "").replace("-", "")} tick={{ fill: "#4a5170", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="profit" name="Profit/Loss" radius={[5, 5, 0, 0]} cursor="pointer">
                      {rows.map((row, i) => <Cell key={i} fill={row.profit >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Combined */}
            {activeChart === "combined" && (
              <motion.div key="combined" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
                <p className="text-white font-bold text-sm">📊 Income vs Cost vs Profit</p>
                <p className="text-[#4a5170] text-xs mt-0.5 mb-4">Full picture ek jagah</p>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    onClick={(e) => { if (e?.activePayload?.[0]) setDetailRow(rows.find(r => r.label === e.activePayload[0].payload.label)); }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="label" tick={{ fill: "#4a5170", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtShort(v).replace("₹", "")} tick={{ fill: "#4a5170", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Income" fill={C.income} radius={[4,4,0,0]} fillOpacity={0.9} cursor="pointer" />
                    <Bar dataKey="cost"   name="Cost"   fill="#64748b"  radius={[4,4,0,0]} fillOpacity={0.7} cursor="pointer" />
                    <Bar dataKey="profit" name="Profit" radius={[4,4,0,0]} fillOpacity={0.85} cursor="pointer">
                      {rows.map((row, i) => <Cell key={i} fill={row.profit >= 0 ? C.profit : C.loss} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {[{ label: "Income", color: C.income }, { label: "Cost", color: "#64748b" }, { label: "Profit", color: C.profit }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-[10px] text-[#4a5580]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cost breakdown */}
            {activeChart === "cost" && (
              <motion.div key="cost" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
                <p className="text-white font-bold text-sm">🏗️ Cost Structure</p>
                <p className="text-[#4a5170] text-xs mt-0.5 mb-4">Goods, Expenses aur Salary per period</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      {[{ id: "gGrad", c: C.goods }, { id: "eGrad", c: C.expenses }, { id: "sGrad", c: C.salaries }].map(({ id, c }) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={c} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={c} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="label" tick={{ fill: "#4a5170", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtShort(v).replace("₹", "")} tick={{ fill: "#4a5170", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="goods"    name="Goods"    stroke={C.goods}    strokeWidth={2} fill="url(#gGrad)" dot={false} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke={C.expenses} strokeWidth={2} fill="url(#eGrad)" dot={false} />
                    <Area type="monotone" dataKey="salaries" name="Salaries" stroke={C.salaries} strokeWidth={2} fill="url(#sGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {[{ label: "Goods", color: C.goods }, { label: "Expenses", color: C.expenses }, { label: "Salaries", color: C.salaries }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-[10px] text-[#4a5580]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeChart === "cashflow" && (
              <motion.div key="cashflow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
                <p className="text-white font-bold text-sm">💳 Cashflow — Received vs Due</p>
                <p className="text-[#4a5170] text-xs mt-0.5 mb-4">Kitna actually aaya aur kitna baaki hai</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="label" tick={{ fill: "#4a5170", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtShort(v).replace("₹", "")} tick={{ fill: "#4a5170", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="received" name="Received" fill={C.received} radius={[4,4,0,0]} fillOpacity={0.85} />
                    <Bar dataKey="due"      name="Due"      fill={C.due}      radius={[4,4,0,0]} fillOpacity={0.7}  />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {[{ label: "Received", color: C.received }, { label: "Due", color: C.due }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-[10px] text-[#4a5580]">{l.label}</span>
                    </div>
                  ))}
                </div>
                {/* Cashflow summary */}
                <div className="mt-4 grid grid-cols-2 gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#4a5580] uppercase font-bold mb-1">Total Received</p>
                    <p className="text-blue-400 font-black text-lg">{fmtShort(s.totalReceived || 0)}</p>
                    {s.totalIncome > 0 && <p className="text-[10px] text-[#3d4260]">{((s.totalReceived / s.totalIncome) * 100).toFixed(1)}% collected</p>}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[#4a5580] uppercase font-bold mb-1">Total Due</p>
                    <p className={`font-black text-lg ${s.totalDue > 0 ? "text-orange-400" : "text-[#3d4260]"}`}>{fmtShort(s.totalDue || 0)}</p>
                    {s.totalIncome > 0 && s.totalDue > 0 && <p className="text-[10px] text-[#3d4260]">{((s.totalDue / s.totalIncome) * 100).toFixed(1)}% pending</p>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cost Distribution Pie */}
          {s.totalCost > 0 && (
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
              <p className="text-white font-bold text-sm mb-0.5">🥧 Cost Distribution</p>
              <p className="text-[#4a5170] text-xs mb-4">Paisa kahan gaya</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={160} className="sm:w-[180px] sm:flex-shrink-0">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                      {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={v => fmtAmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full space-y-3">
                  {[
                    { label: "Goods",    val: s.totalGoods,    pct: cb.goodsPct,    color: C.goods    },
                    { label: "Expenses", val: s.totalExpenses, pct: cb.expensesPct, color: C.expenses },
                    { label: "Salaries", val: s.totalSalaries, pct: cb.salariesPct, color: C.salaries },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                          <span className="text-[#8b9ab8] text-xs">{item.label}</span>
                        </div>
                        <span className="text-white text-xs font-bold">
                          {fmtShort(item.val)}{" "}
                          <span className="text-[#4a5170] font-normal">({item.pct}%)</span>
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full" style={{ background: item.color }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex justify-between items-center">
                      <p className="text-[#4a5170] text-xs">Total Cost</p>
                      <p className="text-white font-black text-sm">{fmtAmt(s.totalCost)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {si && (si.totalPurchased > 0 || si.totalInvested > 0) && (
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
              <p className="text-white font-bold text-sm mb-0.5">🏭 Stock Overview</p>
              <p className="text-[#4a5170] text-xs mb-4">Raw material purchased vs invested</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-3.5" style={{ background: "#3b82f610", border: "1px solid #3b82f620" }}>
                  <p className="text-[10px] text-[#4a5580] uppercase font-bold mb-1">📦 Total Purchased</p>
                  <p className="text-blue-400 font-black text-xl">{Number(si.totalPurchased || 0).toFixed(1)} kg</p>
                </div>
                <div className="rounded-xl p-3.5" style={{ background: "#f59e0b10", border: "1px solid #f59e0b20" }}>
                  <p className="text-[10px] text-[#4a5580] uppercase font-bold mb-1">💰 Total Invested</p>
                  <p className="text-amber-400 font-black text-xl">{fmtShort(si.totalInvested)}</p>
                </div>
              </div>
              {si.totalPurchased > 0 && si.totalInvested > 0 && (
                <p className="text-[11px] text-[#4a5580] mt-3">
                  Avg Rate: <span className="text-white font-semibold">₹{Math.round(si.totalInvested / si.totalPurchased)}/kg</span>
                </p>
              )}
            </div>
          )}

          {/* Period Table */}
          <div className="rounded-2xl p-4 sm:p-5" style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
            <p className="text-white font-bold text-sm mb-0.5">📋 Period Wise P&L</p>
            <p className="text-[#4a5170] text-xs mb-4">Har period ka full breakdown · Tap row for details</p>
            <PeriodTable rows={rows} summary={s} onRowClick={setDetailRow} />
          </div>

        </motion.div>
      )}
      <AnimatePresence>
        {detailRow && <PeriodDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
      </AnimatePresence>
    </div>
  );
}