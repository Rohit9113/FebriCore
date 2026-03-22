//src/components/IncomeSection.jsx
"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");
  if (token) cfg.headers.Authorization  = `Bearer ${token}`;
  if (role)  cfg.headers["x-user-role"] = role;
  return cfg;
});

const fmtAmt   = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtShort = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ─── Custom Tooltip ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <p className="text-white font-bold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-[#8b9ab8]">{p.name}:</span>
          <span className="text-white font-bold ml-2">₹{Number(p.value||0).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function IncomeSection() {
  const [view,         setView]         = useState("monthly");
  const [year,         setYear]         = useState(CURRENT_YEAR);
  const [data,         setData]         = useState(null);
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error,        setError]        = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchIncome = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = view === "monthly"
        ? { view: "monthly", year }
        : { view: "yearly", years: 5 };
      const { data: res } = await api.get("/dashboard/income", { params });
      if (res.success) setData(res.data);
      else setError(res.error || "Data load nahi hua");
    } catch (err) {
      setError(err?.response?.data?.error || "Server error");
    } finally { setLoading(false); }
  }, [view, year]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data: res } = await api.get("/orders/complete");
      if (res.success) setOrders(res.data || []);
    } catch { /* silent */ }
    finally { setOrdersLoading(false); }
  }, []);

  useEffect(() => { fetchIncome(); }, [fetchIncome]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const chartRows = data?.labels?.map((label, i) => ({
    label,
    income:   Math.round(data.income[i]         || 0),
    received: Math.round(data.receivedAmount[i] || 0),
    due:      Math.round(data.dueAmount[i]       || 0),
    orders:   data.orderCount[i] || 0,
  })) || [];

  const s         = data?.summary;
  const maxIncome = Math.max(...(data?.income || [0]));

  return (
    // ✅ FIX: min-h-screen + bg-[#0d0f18] hataya — dashboard ke andar render hoga
    <div className="pb-6 px-4 pt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
            💰 Income
          </h1>
          <p className="text-[#4a5170] text-sm mt-0.5">Completed orders se total earnings</p>
        </div>
        <button onClick={() => { fetchIncome(); fetchOrders(); }}
          className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/8 rounded-2xl text-gray-400 hover:text-white active:scale-90 transition-all">
          🔄
        </button>
      </div>

      {/* View + Year toggles */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex bg-[#13151f] border border-white/8 rounded-2xl p-1 gap-1">
          {[{ key:"monthly", label:"📅 Monthly" }, { key:"yearly", label:"📆 Yearly" }].map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${view===v.key?"bg-amber-500 text-black shadow-lg shadow-amber-500/20":"text-[#6b7a99] hover:text-white"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {view === "monthly" && (
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.15 }}
              className="flex bg-[#13151f] border border-white/8 rounded-2xl p-1 gap-1 flex-wrap">
              {YEAR_OPTIONS.map((y) => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${year===y?"bg-amber-500/20 border border-amber-500/30 text-amber-400":"text-[#6b7a99] hover:text-white"}`}>
                  {y}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-[#4a5170] text-sm">Income data load ho raha hai...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-4 text-red-400 text-sm text-center mb-4">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && data && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="space-y-4">

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Income */}
            <div className="col-span-2 bg-gradient-to-br from-amber-500/15 via-[#13151f] to-[#13151f] border border-amber-500/25 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#4a5170] font-bold uppercase tracking-wide mb-1">
                    {view==="monthly" ? `Total Income ${year}` : "Total Income (All Years)"}
                  </p>
                  <p className="text-3xl font-black text-amber-400" style={{ fontFamily:"'Syne',sans-serif" }}>
                    {fmtAmt(s.totalIncome)}
                  </p>
                  <p className="text-[#4a5170] text-xs mt-1">
                    {s.totalOrders} orders · Avg {fmtAmt(s.avgOrderValue)}/order
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl">💰</div>
              </div>
            </div>

            {/* Received */}
            <div className="bg-[#13151f] border border-emerald-500/20 rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-lg mb-3">✅</div>
              <p className="text-[10px] text-[#4a5170] font-bold uppercase tracking-wide">Received</p>
              <p className="text-emerald-400 font-black text-lg mt-0.5">{fmtAmt(s.totalReceived)}</p>
              <p className="text-[10px] text-[#3d4260] mt-1">
                {s.totalIncome > 0 ? Math.round((s.totalReceived/s.totalIncome)*100) : 0}% collected
              </p>
            </div>

            {/* Due */}
            <div className="bg-[#13151f] border border-orange-500/20 rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-lg mb-3">⏳</div>
              <p className="text-[10px] text-[#4a5170] font-bold uppercase tracking-wide">Due / Pending</p>
              <p className="text-orange-400 font-black text-lg mt-0.5">{fmtAmt(s.totalDue)}</p>
              <p className="text-[10px] text-[#3d4260] mt-1">{s.totalOrders} orders mein se</p>
            </div>

            {/* Best Period */}
            {s.bestPeriod && (
              <div className="col-span-2 bg-[#13151f] border border-white/8 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl flex-shrink-0">🏆</div>
                <div><p className="text-[10px] text-[#4a5170] font-bold uppercase tracking-wide">Best Period</p><p className="text-white font-black">{s.bestPeriod.label}</p></div>
                <p className="text-amber-400 font-black text-xl ml-auto">{fmtAmt(s.bestPeriod.amount)}</p>
              </div>
            )}
          </div>

          {/* ── Bar Chart ── */}
          <div className="bg-[#13151f] border border-white/8 rounded-2xl p-4">
            <p className="text-white font-bold text-sm mb-0.5">📊 {view==="monthly"?`Monthly Income — ${year}`:"Yearly Income"}</p>
            <p className="text-[#4a5170] text-xs mb-4">Har period ka total income</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartRows} margin={{ top:8, right:4, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                <XAxis dataKey="label" tick={{ fill:"#4a5170", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtShort(v).replace("₹","")} tick={{ fill:"#4a5170", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name="Income" radius={[6,6,0,0]}>
                  {chartRows.map((row, i) => (
                    <Cell key={i} fill={row.income===maxIncome&&row.income>0?"#f59e0b":"#f59e0b66"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Area Chart ── */}
          <div className="bg-[#13151f] border border-white/8 rounded-2xl p-4">
            <p className="text-white font-bold text-sm mb-0.5">💳 Received vs Due</p>
            <p className="text-[#4a5170] text-xs mb-4">Kitna collect hua aur kitna baaki hai</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartRows} margin={{ top:8, right:4, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="dueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                <XAxis dataKey="label" tick={{ fill:"#4a5170", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtShort(v).replace("₹","")} tick={{ fill:"#4a5170", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="received" name="Received" stroke="#10b981" strokeWidth={2} fill="url(#recGrad)" dot={false} />
                <Area type="monotone" dataKey="due"      name="Due"      stroke="#f97316" strokeWidth={2} fill="url(#dueGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs text-[#6b7a99]">Received</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-xs text-[#6b7a99]">Due</span></div>
            </div>
          </div>

          {/* ── Period Table ── */}
          <div className="bg-[#13151f] border border-white/8 rounded-2xl p-4">
            <p className="text-white font-bold text-sm mb-0.5">📋 Period Wise Summary</p>
            <p className="text-[#4a5170] text-xs mb-4">Har period ka detail</p>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs min-w-[360px]">
                <thead>
                  <tr className="text-[#4a5170] border-b border-white/5">
                    {["Period","Income","Received","Due","Orders"].map((h) => (
                      <th key={h} className="text-left py-2 pr-3 font-bold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartRows.map((row, i) => (
                    <tr key={i} className={`border-b border-white/5 transition-colors ${row.income===maxIncome&&row.income>0?"bg-amber-500/5":"hover:bg-white/[0.02]"}`}>
                      <td className="py-2.5 pr-3 font-bold text-white">
                        <span className="flex items-center gap-1.5">
                          {row.income===maxIncome&&row.income>0&&<span className="text-amber-500">★</span>}
                          {row.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-amber-400 font-bold">{row.income?fmtShort(row.income):"—"}</td>
                      <td className="py-2.5 pr-3 text-emerald-400">{row.received?fmtShort(row.received):"—"}</td>
                      <td className={`py-2.5 pr-3 font-semibold ${row.due>0?"text-orange-400":"text-[#3d4260]"}`}>{row.due>0?fmtShort(row.due):"—"}</td>
                      <td className="py-2.5 pr-3 text-[#6b7a99]">{row.orders>0?row.orders:"—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/10">
                    <td className="py-3 text-[#6b7a99] font-bold uppercase text-xs">Total</td>
                    <td className="py-3 text-amber-400 font-black">{fmtShort(s.totalIncome)}</td>
                    <td className="py-3 text-emerald-400 font-black">{fmtShort(s.totalReceived)}</td>
                    <td className={`py-3 font-black ${s.totalDue>0?"text-orange-400":"text-[#3d4260]"}`}>{s.totalDue>0?fmtShort(s.totalDue):"—"}</td>
                    <td className="py-3 text-white font-black">{s.totalOrders}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Completed Orders Table ── */}
          <div className="bg-[#13151f] border border-white/8 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-bold text-sm">✅ Completed Orders</p>
              <span className="text-xs text-[#4a5170] bg-white/5 px-2 py-1 rounded-lg">
                {orders.length} orders
              </span>
            </div>
            <p className="text-[#4a5170] text-xs mb-4">Sab complete hue orders ka record</p>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                <p className="text-[#4a5170] text-sm">Orders load ho rahe hain...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-[#4a5170] text-sm">Koi completed order nahi mila</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order, i) => {
                  const payment   = order.paymentReceive || {};
                  const customer  = order.customer || {};
                  const isExpanded = expandedOrder === order._id;
                  const hasDue    = (payment.dueAmount || 0) > 0;

                  return (
                    <motion.div key={order._id || i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "#0d0f18",
                        border:     `1px solid ${hasDue ? "rgba(249,115,22,0.2)" : "rgba(16,185,129,0.15)"}`,
                      }}>

                      {/* Card header */}
                      <button className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                        onClick={() => setExpandedOrder(isExpanded ? null : order._id)}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
                            style={{ background: hasDue ? "rgba(249,115,22,0.15)" : "rgba(16,185,129,0.15)", color: hasDue ? "#f97316" : "#10b981" }}>
                            {customer.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-bold text-sm truncate">{customer.name || "Unknown"}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {customer.phone && <a href={`tel:${customer.phone}`} onClick={e=>e.stopPropagation()} className="text-blue-400 font-mono text-xs">{customer.phone}</a>}
                              {payment.completedDate && <span className="text-[#3d4260] text-xs">{fmtDate(payment.completedDate)}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Amount pills */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-emerald-400 font-black text-sm">{fmtShort(payment.receivedAmount || 0)}</p>
                            {hasDue && <p className="text-orange-400 text-xs font-bold">Due: {fmtShort(payment.dueAmount)}</p>}
                          </div>
                          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-[#4a5170] text-sm">▾</motion.span>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="px-4 py-3 space-y-3">

                              {/* Amount breakdown */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl px-3 py-2 text-center" style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.15)" }}>
                                  <p className="text-[9px] text-[#4a5170] uppercase font-black mb-0.5">Total</p>
                                  <p className="text-amber-400 font-black text-sm">{fmtShort(payment.totalAmount || 0)}</p>
                                </div>
                                <div className="rounded-xl px-3 py-2 text-center" style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.15)" }}>
                                  <p className="text-[9px] text-[#4a5170] uppercase font-black mb-0.5">Mila</p>
                                  <p className="text-emerald-400 font-black text-sm">{fmtShort(payment.receivedAmount || 0)}</p>
                                </div>
                                <div className="rounded-xl px-3 py-2 text-center" style={{ background: hasDue?"rgba(249,115,22,0.08)":"rgba(255,255,255,0.03)", border: hasDue?"1px solid rgba(249,115,22,0.15)":"1px solid rgba(255,255,255,0.06)" }}>
                                  <p className="text-[9px] text-[#4a5170] uppercase font-black mb-0.5">Due</p>
                                  <p className={`font-black text-sm ${hasDue?"text-orange-400":"text-[#3d4260]"}`}>{hasDue?fmtShort(payment.dueAmount):"Clear ✓"}</p>
                                </div>
                              </div>

                              {/* Profit if available */}
                              {payment.grossProfit !== undefined && (
                                <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
                                  style={{ background: payment.grossProfit>=0?"rgba(16,185,129,0.06)":"rgba(239,68,68,0.06)", border: payment.grossProfit>=0?"1px solid rgba(16,185,129,0.15)":"1px solid rgba(239,68,68,0.15)" }}>
                                  <p className="text-xs text-[#4a5170] font-bold">📈 Gross Profit</p>
                                  <p className={`font-black text-sm ${payment.grossProfit>=0?"text-emerald-400":"text-red-400"}`}>
                                    {payment.grossProfit>=0?"+":""}{fmtAmt(payment.grossProfit)}
                                  </p>
                                </div>
                              )}

                              {/* Orders list */}
                              {(order.orders || []).length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#4a5170] font-black uppercase tracking-wide mb-1.5">Items ({order.orders.length})</p>
                                  <div className="space-y-1">
                                    {order.orders.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2 flex-wrap rounded-xl px-3 py-2" style={{ background:"rgba(255,255,255,0.02)" }}>
                                        <span className="text-[#3d4260] text-xs w-4">{idx+1}.</span>
                                        <span className="text-gray-200 text-xs font-mono">{item.height??"-"} × {item.width??"-"} ft</span>
                                        {item.metalType && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background:"rgba(245,158,11,0.1)", color:"#f59e0b" }}>{item.metalType}</span>}
                                        {item.description && <span className="text-xs text-blue-400">📝 {item.description}</span>}
                                        {item.amount > 0 && <span className="text-xs text-emerald-400 ml-auto">{fmtAmt(item.amount)}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Material usage */}
                              {payment.materialUsage?.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#4a5170] font-black uppercase tracking-wide mb-1.5">⚙️ Iron Used</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {payment.materialUsage.map((m, mi) => (
                                      <div key={mi} className="rounded-xl px-3 py-2 text-xs" style={{ background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.15)" }}>
                                        <p className="text-blue-400 font-bold">{m.metalType}</p>
                                        <p className="text-[#4a5170]">{m.kgUsed?.toFixed(1)} kg</p>
                                        <p className="text-red-400 font-bold">₹{(m.materialCost||0).toLocaleString("en-IN")}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Address */}
                              {customer.address && (
                                <p className="text-[#3d4260] text-xs">📍 {customer.address}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </motion.div>
      )}
    </div>
  );
}