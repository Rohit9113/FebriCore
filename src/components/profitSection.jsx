"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ─── API ─────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (role)  cfg.headers["x-user-role"] = role;
  return cfg;
});

// ─── Helpers ─────────────────────────────────────────────────────
const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtShort = (n) => {
  const abs  = Math.abs(n || 0);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const C = {
  income:   "#f59e0b",
  goods:    "#ef4444",
  expenses: "#f97316",
  salaries: "#8b5cf6",
  profit:   "#10b981",
  loss:     "#ef4444",
};
const PIE_COLORS = [C.goods, C.expenses, C.salaries];

// ─── Skeleton ────────────────────────────────────────────────────
const SK = ({ cls = "" }) => (
  <div className={`bg-white/[0.04] rounded-2xl animate-pulse ${cls}`} />
);

// ─── Custom Tooltip ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs max-w-[180px]">
      <p className="text-white font-bold mb-1.5 truncate">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-[#8b9ab8] truncate">{p.name}:</span>
          <span className={`font-bold ml-1 ${p.value < 0 ? "text-red-400" : "text-white"}`}>
            {fmtShort(p.value || 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── SummaryCard ────────────────────────────────────────────────
function SummaryCard({ icon, label, value, accent, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 280, damping: 26 }}
      className="rounded-2xl p-3.5 sm:p-4"
      style={{
        background: `${accent}0d`,
        border: `1px solid ${accent}25`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          {icon}
        </div>
        {sub && (
          <span className="text-[9px] text-[#3d4260] font-bold bg-white/[0.04] px-1.5 py-0.5 rounded-lg flex-shrink-0">
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

// ─── Period Table — cards on mobile, table on md+ ────────────────
function PeriodTable({ rows, summary: s }) {
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Period","Income","Cost","Profit/Loss","Status"].map(h => (
                <th key={h} className="text-left py-2.5 pr-4 font-black uppercase tracking-wider text-[#3d4260] text-[10px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="py-3 pr-4 text-white font-semibold">{row.label}</td>
                <td className="py-3 pr-4 text-amber-400 font-bold">
                  {row.income > 0 ? fmtShort(row.income) : "—"}
                </td>
                <td className="py-3 pr-4 text-red-400">
                  {row.cost > 0 ? fmtShort(row.cost) : "—"}
                </td>
                <td className={`py-3 pr-4 font-black ${row.profit > 0 ? "text-emerald-400" : row.profit < 0 ? "text-red-400" : "text-[#3d4260]"}`}>
                  {row.profit !== 0 ? `${row.profit > 0 ? "+" : ""}${fmtShort(row.profit)}` : "—"}
                </td>
                <td className="py-3">
                  {row.income === 0 && row.cost === 0 ? (
                    <span className="text-[#3d4260]">—</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        background: row.profit >= 0 ? "#10b98115" : "#ef444415",
                        color:      row.profit >= 0 ? "#10b981"   : "#ef4444",
                        border:     `1px solid ${row.profit >= 0 ? "#10b98130" : "#ef444430"}`,
                      }}>
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
              <td className={`py-3 font-black text-sm ${s.isProfit ? "text-emerald-400" : "text-red-400"}`}>
                {s.isProfit ? "+" : ""}{fmtShort(s.totalProfit)}
              </td>
              <td className="py-3">
                <span className="px-3 py-1 rounded-full text-xs font-black"
                  style={{
                    background: s.isProfit ? "#10b98115" : "#ef444415",
                    border:     `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}`,
                    color:      s.isProfit ? "#10b981"   : "#ef4444",
                  }}>
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-3.5 flex items-center gap-3"
              style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}
            >
              {/* Left: period label */}
              <div className="w-14 flex-shrink-0">
                <p className="text-white font-black text-sm leading-tight">{row.label}</p>
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[9px] text-[#3d4260] uppercase font-bold">Income</p>
                  <p className="text-amber-400 font-bold text-xs mt-0.5">
                    {row.income > 0 ? fmtShort(row.income) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-[#3d4260] uppercase font-bold">Cost</p>
                  <p className="text-red-400 text-xs mt-0.5">
                    {row.cost > 0 ? fmtShort(row.cost) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-[#3d4260] uppercase font-bold">Net</p>
                  <p className={`font-black text-xs mt-0.5 ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                    {row.profit !== 0 ? `${isProfit ? "+" : ""}${fmtShort(row.profit)}` : "—"}
                  </p>
                </div>
              </div>

              {/* Right: badge */}
              <span className="flex-shrink-0 text-[9px] px-2 py-1 rounded-xl font-black"
                style={{
                  background: isProfit ? "#10b98115" : "#ef444415",
                  color:      isProfit ? "#10b981"   : "#ef4444",
                }}>
                {isProfit ? "✓" : "✗"}
              </span>
            </motion.div>
          );
        })}

        {/* Mobile total */}
        <div className="rounded-2xl p-3.5 mt-2"
          style={{
            background: s.isProfit ? "#10b98110" : "#ef444410",
            border: `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}`,
          }}>
          <div className="flex justify-between items-center">
            <p className="text-white font-black text-sm">Total</p>
            <p className={`font-black text-lg ${s.isProfit ? "text-emerald-400" : "text-red-400"}`}>
              {s.isProfit ? "+" : ""}{fmtShort(s.totalProfit)}
            </p>
          </div>
          <div className="flex gap-4 mt-1.5 text-xs">
            <span className="text-amber-400">In: {fmtShort(s.totalIncome)}</span>
            <span className="text-red-400">Cost: {fmtShort(s.totalCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function ProfitSection() {
  const [view,        setView]        = useState("monthly");
  const [year,        setYear]        = useState(CURRENT_YEAR);
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [activeChart, setActiveChart] = useState("profit");

  const fetchProfit = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = view === "monthly"
        ? { view: "monthly", year }
        : { view: "yearly", years: 5 };
      const { data: res } = await api.get("/dashboard/profit", { params });
      if (res.success) setData(res.data);
      else setError(res.error || "Data load nahi hua");
    } catch (err) {
      setError(err?.response?.data?.error || "Server error");
    } finally { setLoading(false); }
  }, [view, year]);

  useEffect(() => { fetchProfit(); }, [fetchProfit]);

  const rows = data?.labels?.map((label, i) => ({
    label,
    income:   Math.round(data.income[i]    || 0),
    goods:    Math.round(data.goods[i]     || 0),
    expenses: Math.round(data.expenses[i]  || 0),
    salaries: Math.round(data.salaries[i]  || 0),
    cost:     Math.round(data.totalCost[i] || 0),
    profit:   Math.round(data.profit[i]    || 0),
  })) || [];

  const s  = data?.summary;
  const cb = data?.costBreakdown;

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
          {[{ key:"monthly", label:"📅 Monthly" }, { key:"yearly", label:"📆 Yearly" }].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all"
              style={{
                background: view === v.key ? "#f59e0b" : "transparent",
                color:      view === v.key ? "#000" : "#6b7a99",
                boxShadow:  view === v.key ? "0 4px 12px #f59e0b30" : "none",
              }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Year selector — scrollable on mobile */}
        <AnimatePresence>
          {view === "monthly" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: "auto" }}
              exit={{ opacity: 0, scale: 0.95, width: 0 }}
              transition={{ duration: 0.18 }}
              className="flex rounded-2xl p-1 gap-1 overflow-hidden"
              style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}
            >
              {YEAR_OPTIONS.map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                  style={{
                    background:  year === y ? "#f59e0b18" : "transparent",
                    border:      year === y ? "1px solid #f59e0b30" : "1px solid transparent",
                    color:       year === y ? "#f59e0b" : "#6b7a99",
                  }}>
                  {y}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refresh */}
        <motion.button whileTap={{ scale: 0.88, rotate: 180 }} onClick={fetchProfit}
          transition={{ duration: 0.3 }}
          className="w-9 h-9 flex items-center justify-center rounded-xl ml-auto flex-shrink-0"
          style={{ background: "#0c0e1a", border: "1px solid #1e2235", color: "#4a5580" }}>
          🔄
        </motion.button>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <SK cls="h-36 sm:h-44" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SK cls="h-24" /><SK cls="h-24" /><SK cls="h-24" /><SK cls="h-24" />
          </div>
          <SK cls="h-56 sm:h-64" />
          <SK cls="h-48 sm:h-56" />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="rounded-2xl px-4 py-4 text-red-400 text-sm text-center mb-4"
          style={{ background: "#ef444410", border: "1px solid #ef444425" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DATA LOADED
      ══════════════════════════════════════════════════════════ */}
      {!loading && !error && data && s && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >

          {/* ── BIG PROFIT / LOSS HERO CARD ──────────────────────── */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
            style={{
              background:  `linear-gradient(135deg, ${s.isProfit ? "#10b98118" : "#ef444418"} 0%, #0c0e1a 60%)`,
              border:      `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}`,
              boxShadow:   `0 8px 40px ${s.isProfit ? "#10b98108" : "#ef444408"}`,
            }}
          >
            {/* BG glow */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: s.isProfit ? "#10b98115" : "#ef444415" }} />

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
                  style={{ color: s.isProfit ? "#10b98180" : "#ef444480" }}>
                  {view === "monthly" ? `Net ${s.isProfit ? "Profit" : "Loss"} — ${year}` : `Net ${s.isProfit ? "Profit" : "Loss"}`}
                </p>
                <p
                  className="font-black leading-none"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "clamp(1.8rem, 6vw, 3rem)",
                    color: s.isProfit ? "#10b981" : "#ef4444",
                  }}
                >
                  {s.isProfit ? "+" : "-"}{fmtAmt(Math.abs(s.totalProfit))}
                </p>
                <p className="text-[#4a5170] text-xs mt-2 leading-relaxed">
                  Margin: <span className="font-bold" style={{ color: s.isProfit ? "#10b981" : "#ef4444" }}>
                    {Math.abs(s.profitMargin)}%
                  </span>
                  {" · "}In {fmtShort(s.totalIncome)} − Cost {fmtShort(s.totalCost)}
                </p>
              </div>
              <motion.div
                animate={{ rotate: [0, s.isProfit ? 5 : -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0"
                style={{
                  background: s.isProfit ? "#10b98115" : "#ef444415",
                  border:     `1px solid ${s.isProfit ? "#10b98130" : "#ef444430"}`,
                }}
              >
                {s.isProfit ? "✅" : "📉"}
              </motion.div>
            </div>

            {/* Margin progress bar */}
            <div className="mt-4 relative z-10">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#4a5170]">Profit Margin</span>
                <span className="font-bold" style={{ color: s.isProfit ? "#10b981" : "#ef4444" }}>
                  {s.profitMargin}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(s.profitMargin), 100)}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  className="h-full rounded-full relative overflow-hidden"
                  style={{ background: s.isProfit ? "#10b981" : "#ef4444" }}
                >
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ── 4 SUMMARY CARDS ──────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon="💰" label="Total Income"  value={fmtShort(s.totalIncome)}   accent={C.income}   sub={view==="monthly"?`${year}`:"All"} delay={0.05} />
            <SummaryCard icon="📦" label="Goods Cost"    value={fmtShort(s.totalGoods)}    accent={C.goods}    sub={`${cb.goodsPct}%`}                delay={0.1}  />
            <SummaryCard icon="🧾" label="Expenses"      value={fmtShort(s.totalExpenses)} accent={C.expenses} sub={`${cb.expensesPct}%`}              delay={0.15} />
            <SummaryCard icon="👥" label="Salaries"      value={fmtShort(s.totalSalaries)} accent={C.salaries} sub={`${cb.salariesPct}%`}              delay={0.2}  />
          </div>

          {/* ── BEST / WORST PERIOD ──────────────────────────────── */}
          {(s.bestPeriod || s.worstPeriod) && (
            <div className="grid grid-cols-2 gap-3">
              {s.bestPeriod && (
                <div className="rounded-2xl p-3.5 sm:p-4"
                  style={{ background: "#10b98110", border: "1px solid #10b98122" }}>
                  <p className="text-[9px] sm:text-[10px] text-[#4a5170] font-black uppercase tracking-wider mb-1.5">
                    🏆 Best Period
                  </p>
                  <p className="text-white font-black text-sm sm:text-base leading-tight">{s.bestPeriod.label}</p>
                  <p className="text-emerald-400 font-black text-sm mt-0.5">+{fmtShort(s.bestPeriod.profit)}</p>
                </div>
              )}
              {s.worstPeriod && s.worstPeriod.label !== s.bestPeriod?.label && (
                <div className="rounded-2xl p-3.5 sm:p-4"
                  style={{ background: "#ef444410", border: "1px solid #ef444422" }}>
                  <p className="text-[9px] sm:text-[10px] text-[#4a5170] font-black uppercase tracking-wider mb-1.5">
                    📉 Worst Period
                  </p>
                  <p className="text-white font-black text-sm sm:text-base leading-tight">{s.worstPeriod.label}</p>
                  <p className={`font-black text-sm mt-0.5 ${s.worstPeriod.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {s.worstPeriod.profit >= 0 ? "+" : ""}{fmtShort(s.worstPeriod.profit)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── CHART SELECTOR ───────────────────────────────────── */}
          <div className="flex rounded-2xl p-1 gap-1"
            style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
            {[
              { key:"profit",   label:"💹 P&L"     },
              { key:"combined", label:"📊 Overview" },
              { key:"cost",     label:"🏗️ Cost"    },
            ].map(c => (
              <button key={c.key} onClick={() => setActiveChart(c.key)}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
                style={{
                  background: activeChart === c.key ? "#f59e0b" : "transparent",
                  color:      activeChart === c.key ? "#000" : "#6b7a99",
                  boxShadow:  activeChart === c.key ? "0 4px 12px #f59e0b30" : "none",
                }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* ── CHARTS ───────────────────────────────────────────── */}
          <AnimatePresence mode="wait">

            {/* Profit/Loss bars */}
            {activeChart === "profit" && (
              <motion.div key="profit"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                className="rounded-2xl p-4 sm:p-5"
                style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}
              >
                <p className="text-white font-bold text-sm">💹 Profit / Loss per Period</p>
                <p className="text-[#4a5170] text-xs mt-0.5 mb-4">
                  🟢 Green = Profit · 🔴 Red = Loss
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="label" tick={{ fill: "#4a5170", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtShort(v).replace("₹","").replace("-","")} tick={{ fill: "#4a5170", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="profit" name="Profit/Loss" radius={[5, 5, 0, 0]}>
                      {rows.map((row, i) => (
                        <Cell key={i} fill={row.profit >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Combined bar chart */}
            {activeChart === "combined" && (
              <motion.div key="combined"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                className="rounded-2xl p-4 sm:p-5"
                style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}
              >
                <p className="text-white font-bold text-sm">📊 Income vs Cost vs Profit</p>
                <p className="text-[#4a5170] text-xs mt-0.5 mb-4">Full picture ek jagah</p>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="label" tick={{ fill: "#4a5170", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtShort(v).replace("₹","")} tick={{ fill: "#4a5170", fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Income" fill={C.income} radius={[4,4,0,0]} fillOpacity={0.9} />
                    <Bar dataKey="cost"   name="Cost"   fill="#64748b"  radius={[4,4,0,0]} fillOpacity={0.7} />
                    <Bar dataKey="profit" name="Profit" radius={[4,4,0,0]} fillOpacity={0.85}>
                      {rows.map((row, i) => (
                        <Cell key={i} fill={row.profit >= 0 ? C.profit : C.loss} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {[
                    { label:"Income", color:C.income },
                    { label:"Cost",   color:"#64748b" },
                    { label:"Profit", color:C.profit  },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-[10px] text-[#4a5580]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cost breakdown area chart */}
            {activeChart === "cost" && (
              <motion.div key="cost"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                className="rounded-2xl p-4 sm:p-5"
                style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}
              >
                <p className="text-white font-bold text-sm">🏗️ Cost Structure</p>
                <p className="text-[#4a5170] text-xs mt-0.5 mb-4">Goods, Expenses aur Salary per period</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      {[
                        { id:"gGrad", c:C.goods    },
                        { id:"eGrad", c:C.expenses },
                        { id:"sGrad", c:C.salaries },
                      ].map(({ id, c }) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={c} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={c} stopOpacity={0}    />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="label" tick={{ fill:"#4a5170", fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtShort(v).replace("₹","")} tick={{ fill:"#4a5170", fontSize:9 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="goods"    name="Goods"    stroke={C.goods}    strokeWidth={2} fill="url(#gGrad)" dot={false} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke={C.expenses} strokeWidth={2} fill="url(#eGrad)" dot={false} />
                    <Area type="monotone" dataKey="salaries" name="Salaries" stroke={C.salaries} strokeWidth={2} fill="url(#sGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {[
                    { label:"Goods",    color:C.goods    },
                    { label:"Expenses", color:C.expenses },
                    { label:"Salaries", color:C.salaries },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-[10px] text-[#4a5580]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── COST DISTRIBUTION (Pie) ──────────────────────────── */}
          {s.totalCost > 0 && (
            <div className="rounded-2xl p-4 sm:p-5"
              style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
              <p className="text-white font-bold text-sm mb-0.5">🥧 Cost Distribution</p>
              <p className="text-[#4a5170] text-xs mb-4">Paisa kahan gaya</p>

              {/* Stacked on mobile, side-by-side on sm+ */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={160} className="sm:w-[180px] sm:flex-shrink-0">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={v => fmtAmt(v)} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend rows */}
                <div className="flex-1 w-full space-y-3">
                  {[
                    { label:"Goods",    val:s.totalGoods,    pct:cb.goodsPct,    color:C.goods    },
                    { label:"Expenses", val:s.totalExpenses, pct:cb.expensesPct, color:C.expenses },
                    { label:"Salaries", val:s.totalSalaries, pct:cb.salariesPct, color:C.salaries },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: item.color }} />
                          <span className="text-[#8b9ab8] text-xs">{item.label}</span>
                        </div>
                        <span className="text-white text-xs font-bold">
                          {fmtShort(item.val)}{" "}
                          <span className="text-[#4a5170] font-normal">({item.pct}%)</span>
                        </span>
                      </div>
                      {/* Mini bar */}
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.pct}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full"
                          style={{ background: item.color }}
                        />
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

          {/* ── PERIOD TABLE ─────────────────────────────────────── */}
          <div className="rounded-2xl p-4 sm:p-5"
            style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
            <p className="text-white font-bold text-sm mb-0.5">📋 Period Wise P&L</p>
            <p className="text-[#4a5170] text-xs mb-4">Har period ka full breakdown</p>
            <PeriodTable rows={rows} summary={s} />
          </div>

        </motion.div>
      )}
    </div>
  );
}