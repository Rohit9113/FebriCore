//src/app/employee/dashboard/page.jsx
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import axios from "axios";
import useEmployeeRoute from "@/hooks/useEmployeeRoute";

// ─── API ─────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const t = typeof window !== "undefined" ? localStorage.getItem("emp_token") : null;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ─── Helpers ─────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const NOW      = new Date();
const TODAY    = NOW.toISOString().split("T")[0];
const fmtAmt   = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate  = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtShort = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

// ─── CoinBurst ───────────────────────────────────────────────────
const COINS  = ["💰","💵","🪙","💸","✨","⭐","🌟","💎","🔥","👑"];
const GCOLORS = ["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#f97316","#06b6d4"];
function CoinBurst({ trigger }) {
  const [parts, setParts] = useState([]);
  const done = useRef(false);
  useEffect(() => {
    if (!trigger || done.current) return;
    done.current = true;
    setParts(Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: COINS[Math.floor(Math.random() * COINS.length)],
      color: GCOLORS[Math.floor(Math.random() * GCOLORS.length)],
      x: (Math.random() - 0.5) * 420, y: -(Math.random() * 380 + 80),
      r: (Math.random() - 0.5) * 720,  s: Math.random() * 1.3 + 0.5,
      delay: Math.random() * 0.25,     dur: Math.random() * 0.6 + 0.9,
    })));
    setTimeout(() => setParts([]), 2600);
  }, [trigger]);
  if (!parts.length) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
      <motion.div initial={{ scale: 0, opacity: 0.7 }} animate={{ scale: 7, opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="absolute w-20 h-20 rounded-full bg-amber-400/35" />
      {parts.map(p => (
        <motion.div key={p.id}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: p.s, rotate: p.r, opacity: 0 }}
          transition={{ delay: p.delay, duration: p.dur, ease: [0.2, 0.8, 0.4, 1] }}
          className="absolute text-2xl select-none"
          style={{ filter: `drop-shadow(0 0 8px ${p.color})` }}
        >{p.emoji}</motion.div>
      ))}
    </div>
  );
}

// ─── Salary slot-machine reveal ──────────────────────────────────
function SalaryReveal({ amount, trigger }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");
  const done = useRef(false);
  useEffect(() => {
    if (!trigger || !amount || done.current) return;
    done.current = true;
    const ctrl = animate(mv, amount, {
      duration: 1.9, ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setDisplay(Math.floor(v).toLocaleString("en-IN")),
      onComplete: () => setDisplay(amount.toLocaleString("en-IN")),
    });
    return ctrl.stop;
  }, [trigger, amount, mv]);
  return <span className="tabular-nums">₹{display}</span>;
}

// ─── CountUp (safe) ──────────────────────────────────────────────
function CountUp({ to = 0, prefix = "" }) {
  const [val, setVal] = useState(0);
  const prev = useRef(null);
  useEffect(() => {
    if (prev.current === to) return;
    prev.current = to;
    if (!to) { setVal(0); return; }
    const steps = 40, inc = to / steps;
    let cur = 0, n = 0;
    const t = setInterval(() => {
      cur += inc; n++;
      setVal(Math.floor(cur));
      if (n >= steps) { setVal(to); clearInterval(t); }
    }, 1000 / steps);
    return () => clearInterval(t);
  }, [to]);
  if (prefix === "₹") return <span>₹{val.toLocaleString("en-IN")}</span>;
  return <span>{prefix}{val.toLocaleString("en-IN")}</span>;
}

// ─── Mini reusables ──────────────────────────────────────────────
const Card = ({ children, className = "" }) => (
  <div className={`bg-[#0f1120] border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);
const InfoRow = ({ label, value, highlight = false, last = false }) => (
  <div className={`flex justify-between items-start py-3 gap-3 ${!last ? "border-b border-white/[0.05]" : ""}`}>
    <span className="text-[#4a5580] text-xs flex-shrink-0 pt-0.5">{label}</span>
    <span className={`text-sm font-semibold text-right break-all ${highlight ? "text-amber-400" : "text-white"}`}>{value}</span>
  </div>
);
const SecTitle = ({ icon, title }) => (
  <p className="text-white font-bold text-sm flex items-center gap-2 mb-3"><span>{icon}</span>{title}</p>
);
const Fade = ({ children, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
);
const SK = ({ cls = "" }) => <div className={`bg-white/[0.05] rounded-xl animate-pulse ${cls}`} />;

// ════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function EmployeeDashboard() {
  const { empData, loading: authLoading, logout } = useEmployeeRoute();
  const [data,     setData]     = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error,    setError]    = useState("");
  const [tab,      setTab]      = useState("overview");
  const [burst,    setBurst]    = useState(false);
  const [selMonth, setSelMonth] = useState(
    `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}`
  );

  const months = Array.from({ length: 12 }, (_, i) => {
    const d   = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { val, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
  });

  const fetchData = useCallback(async () => {
    if (!empData) return;
    setFetching(true); setError("");
    try {
      const { data: res } = await api.get(`/employees/me?month=${selMonth}`);
      if (res.success) {
        setData(prev => { if (!prev) setTimeout(() => setBurst(true), 500); return res.data; });
      } else setError(res.error || "Data load nahi hua");
    } catch (err) {
      if ([401, 403].includes(err?.response?.status)) logout();
      else setError(err?.response?.data?.error || "Server error");
    } finally { setFetching(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empData, selMonth]);

  useEffect(() => { if (empData) fetchData(); }, [empData, selMonth]); // eslint-disable-line

  if (authLoading) return <FullLoader />;

  const p    = data?.profile        || {};
  const ss   = data?.salarySummary  || {};
  const ms   = data?.monthSummary   || {};
  const att  = data?.attendance     || { present: [], absent: [] };
  const pays = data?.payments       || [];
  const hist = data?.salaryHistory  || [];

  const selLabel     = months.find(m => m.val === selMonth)?.label || "";
  const paidPct      = ss?.totalEarned > 0 ? Math.round((ss.totalPaid / ss.totalEarned) * 100) : 0;
  const todayPresent = att.present.includes(TODAY);
  const todayAbsent  = att.absent.includes(TODAY);
  const monthPresent = att.present.filter(d => d.startsWith(selMonth));
  const monthAbsent  = att.absent.filter(d => d.startsWith(selMonth));

  return (
    <div className="min-h-screen bg-[#080a12]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <CoinBurst trigger={burst} />

      {/* BG glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/4 rounded-full blur-[120px]" />
      </div>

      {/* ══ HEADER ════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#080a12]/96 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 lg:px-8 py-3 max-w-screen-xl mx-auto">

          {/* Avatar */}
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.1 }}
            className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400/40 to-indigo-700/30 border border-blue-400/25 flex items-center justify-center font-black text-lg text-blue-200">
              {p?.name?.charAt(0)?.toUpperCase() || "👷"}
            </div>
            <motion.span animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080a12]" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
              {p?.name || empData?.name || "Loading..."}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[#3d4870] text-[10px] font-mono">{p?.empId || empData?.empId || "—"}</p>
              {p?.isActive === false && (
                <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold">INACTIVE</span>
              )}
            </div>
          </div>

          {/* Desktop: month selector in header */}
          <div className="hidden lg:flex gap-1.5 overflow-x-auto scrollbar-hide max-w-lg">
            {months.slice(0, 8).map(m => (
              <motion.button key={m.val} whileTap={{ scale: 0.93 }} onClick={() => setSelMonth(m.val)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border
                  ${selMonth === m.val
                    ? "bg-blue-500/22 border-blue-400/30 text-blue-300"
                    : "bg-white/[0.03] border-white/[0.05] text-[#3d4870] hover:text-white/70"}`}>
                {m.label}
              </motion.button>
            ))}
          </div>

          {/* Refresh */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={fetchData} disabled={fetching}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07] text-[#4a5580] hover:text-white transition-colors disabled:opacity-30">
            <motion.svg animate={fetching ? { rotate: 360 } : {}}
              transition={fetching ? { duration: 0.9, repeat: Infinity, ease: "linear" } : {}}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </motion.svg>
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }} onClick={logout}
            className="px-3 py-1.5 bg-red-500/8 border border-red-500/15 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/18 transition-colors">
            Logout
          </motion.button>
        </div>
      </header>

      {/* ══ PAGE BODY ══════════════════════════════════════════ */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-8 pt-5 pb-20">

        {/* Error */}
        <AnimatePresence>
          {error && !fetching && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3.5 flex justify-between items-center">
              <span className="text-red-400 text-sm">⚠ {error}</span>
              <button onClick={fetchData} className="text-red-300 text-xs font-bold underline ml-4">Retry</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── SKELETON ─────────────────────────────────────── */}
        {fetching && !data && (
          <div className="space-y-4">
            {/* Mobile month selector skeleton */}
            <div className="flex gap-2 lg:hidden">{[1,2,3,4,5].map(i => <SK key={i} cls="h-9 w-20 flex-shrink-0" />)}</div>
            {/* Desktop skeleton grid */}
            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
              <div className="lg:col-span-1 space-y-4">
                <SK cls="h-72 rounded-3xl" />
                <SK cls="h-16 rounded-2xl" />
                <div className="grid grid-cols-2 gap-3"><SK cls="h-28" /><SK cls="h-28" /><SK cls="h-28" /><SK cls="h-28" /></div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <SK cls="h-14 rounded-2xl" />
                <SK cls="h-64 rounded-2xl" />
                <SK cls="h-64 rounded-2xl" />
              </div>
            </div>
            {/* Mobile skeleton */}
            <div className="lg:hidden space-y-4">
              <SK cls="h-56 rounded-3xl" />
              <SK cls="h-16 rounded-2xl" />
              <div className="grid grid-cols-2 gap-3"><SK cls="h-28" /><SK cls="h-28" /><SK cls="h-28" /><SK cls="h-28" /></div>
              <SK cls="h-14 rounded-2xl" />
              <SK cls="h-48 rounded-2xl" />
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Mobile month selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 mb-4 lg:hidden">
              {months.map(m => (
                <motion.button key={m.val} whileTap={{ scale: 0.9 }} onClick={() => setSelMonth(m.val)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border
                    ${selMonth === m.val
                      ? "bg-blue-500/22 border-blue-400/30 text-blue-300"
                      : "bg-[#0f1120] border-white/[0.06] text-[#3d4870]"}`}>
                  {m.label}
                </motion.button>
              ))}
            </div>

            {/* ════════════════════════════════════════════════
                DESKTOP LAYOUT: sidebar left + content right
                MOBILE LAYOUT:  single column stacked
            ════════════════════════════════════════════════ */}
            <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-6 xl:grid-cols-[380px_1fr]">

              {/* ╔════════════════════════════════════════════╗
                  ║  LEFT SIDEBAR (desktop) / Top (mobile)    ║
                  ╚════════════════════════════════════════════╝ */}
              <div className="space-y-4 lg:space-y-5">

                {/* HERO SALARY CARD */}
                <Fade>
                  <motion.div
                    className="relative rounded-3xl overflow-hidden p-5 lg:p-6"
                    style={{ background: "linear-gradient(145deg,#0c1428 0%,#0f1120 55%,#080c1e 100%)" }}
                  >
                    <div className="absolute inset-0 rounded-3xl border border-blue-500/15 pointer-events-none" />
                    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
                    <div className="absolute top-0 right-0 w-56 h-56 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/8 rounded-full blur-2xl pointer-events-none" />
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-16 -right-16 w-52 h-52 rounded-full border border-blue-400/8 pointer-events-none" />

                    <div className="flex items-start justify-between mb-5 relative z-10">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/50 mb-2">
                          Total Salary Kamai 💼
                        </p>
                        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="font-black text-white leading-none"
                          style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(2rem, 5vw, 2.6rem)" }}>
                          <SalaryReveal amount={ss?.totalEarned || 0} trigger={!!data} />
                        </motion.p>
                        <p className="text-[#3d4870] text-xs mt-2">
                          {ss?.totalPresentDays || 0} din ·{" "}
                          <span className="text-blue-300/60">{fmtAmt(ss?.perDaySalary)}/din</span>
                        </p>
                      </div>
                      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
                        className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-3xl flex-shrink-0">
                        💰
                      </motion.div>
                    </div>

                    {/* Pills */}
                    <div className="grid grid-cols-3 gap-2 mb-5 relative z-10">
                      {[
                        { label: "Mila ✓",   val: fmtAmt(ss?.totalPaid),
                          color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
                        { label: ss?.totalDue > 0 ? "Baaki ⏳" : "Clear ✓",
                          val: ss?.totalDue > 0 ? fmtAmt(ss.totalDue) : "Sab Mila",
                          color: ss?.totalDue > 0 ? "text-orange-400" : "text-emerald-400",
                          bg:    ss?.totalDue > 0 ? "bg-orange-500/10 border-orange-400/15" : "bg-emerald-500/8 border-emerald-500/12" },
                        { label: "Payments", val: `${ss?.paymentCount || 0}×`,
                          color: "text-blue-300", bg: "bg-blue-500/10 border-blue-400/15" },
                      ].map(s => (
                        <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.bg}`}>
                          <p className={`font-black text-sm leading-tight ${s.color}`}>{s.val}</p>
                          <p className="text-[9px] text-[#3d4870] mt-1 uppercase tracking-wide">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    {ss?.totalEarned > 0 && (
                      <div className="relative z-10">
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="text-emerald-400 font-bold">Paid: {paidPct}%</span>
                          <span className="text-[#3d4870]">{fmtAmt(ss?.totalPaid)} / {fmtAmt(ss?.totalEarned)}</span>
                        </div>
                        <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${paidPct}%` }}
                            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                            className="h-full rounded-full relative overflow-hidden"
                            style={{ background: "linear-gradient(90deg,#3b82f6,#10b981)" }}>
                            <motion.div animate={{ x: ["-100%", "200%"] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 2 }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                          </motion.div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </Fade>

                {/* TODAY BANNER */}
                <Fade delay={0.1}>
                  <AnimatePresence mode="wait">
                    {todayPresent ? (
                      <motion.div key="p" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-4 py-3.5">
                        <motion.span animate={{ rotate: [0,-10,10,0], scale: [1,1.15,1] }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                          className="text-2xl">✅</motion.span>
                        <div>
                          <p className="text-emerald-400 font-black text-sm">Aaj Present Hai 🎯</p>
                          <p className="text-[#3d4870] text-xs mt-0.5">{fmtDate(TODAY)} · {fmtAmt(p?.perDaySalary)} milega</p>
                        </div>
                      </motion.div>
                    ) : todayAbsent ? (
                      <motion.div key="a" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3.5">
                        <span className="text-2xl">❌</span>
                        <div>
                          <p className="text-red-400 font-black text-sm">Aaj Absent Hai</p>
                          <p className="text-[#3d4870] text-xs mt-0.5">{fmtDate(TODAY)}</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="n" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 bg-amber-500/6 border border-amber-500/15 rounded-2xl px-4 py-3.5">
                        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                          className="text-2xl">⏳</motion.span>
                        <div>
                          <p className="text-amber-400 font-black text-sm">Aaj Ka Attendance Pending</p>
                          <p className="text-[#3d4870] text-xs mt-0.5">{fmtDate(TODAY)}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Fade>

                {/* MONTHLY SUMMARY GRID */}
                {ms && (
                  <Fade delay={0.15}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#3d4870] mb-2.5 px-0.5">
                        📅 {selLabel}
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { icon:"✅", label:"Present", value:`${ms.presentDays||0} din`, sub:fmtAmt(ms.earned),
                            cls:"bg-emerald-500/8 border-emerald-500/15 text-emerald-400" },
                          { icon:"❌", label:"Absent",  value:`${ms.absentDays||0} din`,  sub:"salary nahi",
                            cls:"bg-red-500/8 border-red-500/15 text-red-400" },
                          { icon:"💰", label:"Mila",    value:fmtAmt(ms.paid),             sub:selLabel,
                            cls:"bg-blue-500/8 border-blue-500/15 text-blue-300" },
                          { icon:"⏳", label:"Baaki",
                            value:ms.due>0?fmtAmt(ms.due):"Sab Mila ✓",
                            sub:ms.due>0?"pending":"clear!",
                            cls:ms.due>0?"bg-orange-500/8 border-orange-500/18 text-orange-400":"bg-emerald-500/8 border-emerald-500/15 text-emerald-400" },
                        ].map((s, i) => (
                          <motion.div key={s.label}
                            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + i * 0.06 }}
                            className={`rounded-2xl border p-3.5 ${s.cls}`}>
                            <span className="text-xl">{s.icon}</span>
                            <p className="font-black text-base mt-2 leading-tight">{s.value}</p>
                            <p className="text-[10px] opacity-55 mt-0.5 uppercase tracking-wide font-bold">{s.label}</p>
                            <p className="text-[10px] opacity-35 mt-0.5">{s.sub}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </Fade>
                )}

                {/* PROFILE — desktop sidebar only */}
                <div className="hidden lg:block">
                  <Fade delay={0.2}>
                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.05]">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-700/20 border border-blue-500/20 flex items-center justify-center font-black text-2xl text-blue-200 flex-shrink-0">
                          {p?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black text-base leading-tight truncate"
                             style={{ fontFamily: "'Syne', sans-serif" }}>{p?.name}</p>
                          <p className="text-[#4a5580] text-xs font-mono mt-0.5">{p?.empId}</p>
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full mt-1 font-bold border
                            ${p?.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/15 text-red-400 border-red-500/20"}`}>
                            {p?.isActive ? "● Active" : "○ Inactive"}
                          </span>
                        </div>
                      </div>
                      <SecTitle icon="📋" title="Info" />
                      <InfoRow label="Phone"        value={p?.phone} />
                      <InfoRow label="Address"      value={p?.address || "—"} />
                      <InfoRow label="Joined"       value={fmtDate(p?.joiningDate)} />
                      <InfoRow label="Salary/Din"   value={fmtAmt(p?.perDaySalary)} highlight last />
                    </Card>
                  </Fade>
                </div>
              </div>

              {/* ╔════════════════════════════════════════════╗
                  ║  RIGHT CONTENT (desktop) / Bottom (mobile)║
                  ╚════════════════════════════════════════════╝ */}
              <div className="mt-4 lg:mt-0 space-y-4 lg:space-y-5">

                {/* TABS */}
                <Fade delay={0.05}>
                  <div className="bg-[#0b0d1c] border border-white/[0.06] rounded-2xl p-1 grid grid-cols-4 gap-1">
                    {[
                      { key:"overview",   icon:"📊", label:"Overview"   },
                      { key:"attendance", icon:"📅", label:"Attendance" },
                      { key:"payments",   icon:"💸", label:"Payments"   },
                      { key:"profile",    icon:"👤", label:"Profile"    },
                    ].map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)}
                        className={`relative py-3 rounded-xl text-xs font-bold transition-colors
                          ${tab === t.key ? "text-white" : "text-[#3d4870] hover:text-white/60"}`}>
                        {tab === t.key && (
                          <motion.div layoutId="deskTab"
                            className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-600/20"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <span className="text-base lg:text-lg leading-none">{t.icon}</span>
                          <span className="hidden sm:inline">{t.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Fade>

                {/* TAB CONTENT */}
                <AnimatePresence mode="wait">

                  {/* ── OVERVIEW ── */}
                  {tab === "overview" && (
                    <motion.div key="ov" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      {/* All-time */}
                      <Card className="p-5">
                        <SecTitle icon="💼" title="Poori Kamai — All Time" />
                        {/* Desktop: 3-col grid */}
                        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 mb-4">
                          {[
                            { label: "Total Earned",   val: fmtAmt(ss?.totalEarned),           color: "text-amber-400",   bg: "bg-amber-500/8 border-amber-500/15"   },
                            { label: "Total Paid ✓",   val: fmtAmt(ss?.totalPaid),             color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15" },
                            { label: ss?.totalDue > 0 ? "Total Due ⏳" : "Status",
                              val:   ss?.totalDue > 0 ? fmtAmt(ss.totalDue) : "Sab Clear ✓",
                              color: ss?.totalDue > 0 ? "text-orange-400" : "text-emerald-400",
                              bg:    ss?.totalDue > 0 ? "bg-orange-500/8 border-orange-500/15" : "bg-emerald-500/8 border-emerald-500/15" },
                          ].map(s => (
                            <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                              <p className={`font-black text-xl ${s.color}`}>{s.val}</p>
                              <p className="text-[10px] text-[#4a5580] mt-1 uppercase tracking-wide">{s.label}</p>
                            </div>
                          ))}
                        </div>
                        {/* Mobile: table */}
                        <div className="lg:hidden">
                          <InfoRow label="Total Earned"  value={fmtAmt(ss?.totalEarned)} highlight />
                          <InfoRow label="Total Paid ✓"  value={fmtAmt(ss?.totalPaid)}             />
                          <InfoRow label="Total Due ⏳"   value={fmtAmt(ss?.totalDue)}  highlight={ss?.totalDue > 0} />
                        </div>
                        {/* Common rows */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                          {[
                            { label: "Present Days", val: `${ss?.totalPresentDays||0}`, unit: "din", color: "text-emerald-400" },
                            { label: "Absent Days",  val: `${ss?.totalAbsentDays||0}`,  unit: "din", color: "text-red-400"     },
                            { label: "Payments",     val: `${ss?.paymentCount||0}`,     unit: "baar",color: "text-blue-300"    },
                            { label: "Per Day Rate", val: fmtAmt(ss?.perDaySalary),     unit: "/din", color: "text-amber-400"  },
                          ].map(s => (
                            <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                              <p className={`font-black text-lg ${s.color}`}>{s.val}<span className="text-xs font-normal text-[#4a5580] ml-1">{s.unit}</span></p>
                              <p className="text-[10px] text-[#4a5580] mt-0.5">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </Card>

                      {/* Due / Clear */}
                      {ss?.totalDue > 0 ? (
                        <div className="bg-orange-500/8 border border-orange-500/20 rounded-2xl p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <motion.span animate={{ scale: [1,1.15,1] }} transition={{ duration: 1.5, repeat: Infinity }}
                              className="text-2xl">⏳</motion.span>
                            <div>
                              <p className="text-orange-400 font-black text-lg">{fmtAmt(ss.totalDue)} Baaki Hai</p>
                              <p className="text-[#4a5580] text-xs">Admin se milne ki ummeed hai</p>
                            </div>
                          </div>
                          <div className="w-full h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${paidPct}%` }}
                              transition={{ duration: 1.4, ease: "easeOut" }}
                              className="h-full bg-emerald-500 rounded-full" />
                          </div>
                          <div className="flex justify-between text-[11px] mt-2">
                            <span className="text-emerald-400 font-bold">Mila: {fmtAmt(ss.totalPaid)}</span>
                            <span className="text-orange-400">Baaki: {fmtAmt(ss.totalDue)}</span>
                          </div>
                        </div>
                      ) : ss?.totalEarned > 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="bg-emerald-500/6 border border-emerald-500/15 rounded-2xl px-5 py-4 flex items-center gap-3">
                          <motion.span animate={{ rotate: [0,15,-15,0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                            className="text-2xl">🎉</motion.span>
                          <div>
                            <p className="text-emerald-400 font-black">Poora salary mil gaya!</p>
                            <p className="text-[#4a5580] text-sm mt-0.5">Koi due nahi — sab clear hai</p>
                          </div>
                        </motion.div>
                      ) : null}
                    </motion.div>
                  )}

                  {/* ── ATTENDANCE ── */}
                  {tab === "attendance" && (
                    <motion.div key="at" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      {/* Desktop: 2-col layout */}
                      <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-4 lg:space-y-0">
                        {/* Calendar */}
                        <Card className="p-5">
                          <SecTitle icon="📅" title={`${selLabel} — Calendar`} />
                          <AttendanceCalendar month={selMonth} present={att.present} absent={att.absent} />
                        </Card>

                        {/* Stats + dates */}
                        <div className="space-y-4">
                          {ms && (
                            <div className="grid grid-cols-3 gap-2.5">
                              {[
                                { val: ms.presentDays||0, label:"Present", cls:"bg-emerald-500/10 border-emerald-500/12 text-emerald-400" },
                                { val: ms.absentDays||0,  label:"Absent",  cls:"bg-red-500/10 border-red-500/12 text-red-400"            },
                                { val: fmtAmt(ms.earned), label:"Kamai",   cls:"bg-blue-500/10 border-blue-500/12 text-blue-300", sm:true },
                              ].map(s => (
                                <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.cls}`}>
                                  <p className={`font-black leading-tight ${s.sm ? "text-base mt-1" : "text-3xl"}`}>{s.val}</p>
                                  <p className="text-[10px] text-[#4a5580] mt-1 uppercase tracking-wide">{s.label}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <Card className="p-4">
                            <SecTitle icon="✅" title={`Present — ${monthPresent.length} din`} />
                            <DateChips dates={monthPresent}
                              cls="bg-emerald-500/12 border border-emerald-500/18 text-emerald-400"
                              empty="Is mahine koi present record nahi" />
                          </Card>
                          <Card className="p-4">
                            <SecTitle icon="❌" title={`Absent — ${monthAbsent.length} din`} />
                            <DateChips dates={monthAbsent}
                              cls="bg-red-500/10 border border-red-500/15 text-red-400"
                              empty="Is mahine koi absent record nahi" />
                          </Card>
                        </div>
                      </div>

                      {/* All-time */}
                      <Card className="p-4">
                        <SecTitle icon="📊" title="Total Attendance — Sab Mahine" />
                        <div className="grid grid-cols-2 gap-3">
                          <InfoRow label="Total Present" value={`${ss?.totalPresentDays||0} din`} />
                          <InfoRow label="Total Absent"  value={`${ss?.totalAbsentDays||0} din`}  />
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* ── PAYMENTS ── */}
                  {tab === "payments" && (
                    <motion.div key="py" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      {/* Desktop: 3-col summary */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <Card className="p-4 lg:p-5">
                          <p className="text-[10px] text-[#4a5580] uppercase tracking-wide mb-2">Total Mila</p>
                          <p className="text-emerald-400 font-black text-2xl">{fmtAmt(ss?.totalPaid)}</p>
                          <p className="text-[10px] text-[#3d4870] mt-1">{ss?.paymentCount||0} transactions</p>
                        </Card>
                        <Card className="p-4 lg:p-5">
                          <p className="text-[10px] text-[#4a5580] uppercase tracking-wide mb-2">Abhi Baaki</p>
                          <p className={`font-black text-2xl ${ss?.totalDue>0?"text-orange-400":"text-emerald-400"}`}>
                            {ss?.totalDue>0 ? fmtAmt(ss.totalDue) : "Clear ✓"}
                          </p>
                          <p className="text-[10px] text-[#3d4870] mt-1">{ss?.totalDue>0?"pending":"sab mila"}</p>
                        </Card>
                        {ms && (
                          <Card className="p-4 lg:p-5 col-span-2 lg:col-span-1">
                            <p className="text-[10px] text-[#4a5580] uppercase tracking-wide mb-2">{selLabel}</p>
                            <div className="flex gap-3 text-sm">
                              <div>
                                <p className="text-white font-black">{fmtAmt(ms.paid)}</p>
                                <p className="text-[10px] text-[#4a5580] mt-0.5">Mila</p>
                              </div>
                              <div className="w-px bg-white/[0.06]" />
                              <div>
                                <p className={`font-black ${ms.due>0?"text-orange-400":"text-emerald-400"}`}>
                                  {ms.due>0 ? fmtAmt(ms.due) : "Clear ✓"}
                                </p>
                                <p className="text-[10px] text-[#4a5580] mt-0.5">Baaki</p>
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>

                      {/* Payment list */}
                      <Card>
                        <div className="px-5 pt-5 pb-2">
                          <SecTitle icon="💸" title={`Payment History (${pays.length})`} />
                        </div>
                        {pays.length === 0 ? (
                          <div className="py-16 text-center">
                            <p className="text-4xl mb-3">💸</p>
                            <p className="text-[#3d4870] text-sm">Abhi tak koi payment nahi mili</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/[0.05]">
                            {[...pays].reverse().map((pay, i) => (
                              <motion.div key={i}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center flex-shrink-0 text-lg">💵</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-black text-lg">{fmtAmt(pay.amount)}</p>
                                  <p className="text-[#4a5580] text-xs mt-0.5 truncate">
                                    {fmtDate(pay.paidOn)}{pay.note ? ` · ${pay.note}` : ""}
                                  </p>
                                </div>
                                <span className="flex-shrink-0 text-xs bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-xl font-bold">
                                  ✓ Paid
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  )}

                  {/* ── PROFILE ── */}
                  {tab === "profile" && (
                    <motion.div key="pr" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                      className="space-y-4">

                      {/* Desktop: 2-col */}
                      <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-4 lg:space-y-0">
                        <Card className="p-5">
                          <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/[0.05]">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-700/20 border border-blue-500/20 flex items-center justify-center font-black text-3xl text-blue-200 flex-shrink-0">
                              {p?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-black text-xl leading-tight truncate"
                                 style={{ fontFamily: "'Syne', sans-serif" }}>{p?.name}</p>
                              <p className="text-[#4a5580] text-xs font-mono mt-0.5">{p?.empId}</p>
                              <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full mt-1.5 font-bold border
                                ${p?.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/15 text-red-400 border-red-500/20"}`}>
                                {p?.isActive ? "● Active" : "○ Inactive"}
                              </span>
                            </div>
                          </div>
                          <SecTitle icon="📋" title="Personal Info" />
                          <InfoRow label="Full Name"    value={p?.name}                           />
                          <InfoRow label="Employee ID"  value={p?.empId}                          />
                          <InfoRow label="Phone"        value={p?.phone}                          />
                          <InfoRow label="Address"      value={p?.address || "—"}                 />
                          <InfoRow label="Joined"       value={fmtDate(p?.joiningDate)}           />
                          <InfoRow label="Salary"       value={`${fmtAmt(p?.perDaySalary)}/din`} highlight />
                          <InfoRow label="Status"       value={p?.isActive ? "Active ✅" : "Inactive ❌"} last />
                        </Card>

                        {/* Salary history */}
                        {hist.length > 0 && (
                          <Card className="p-5">
                            <SecTitle icon="📈" title={`Salary History (${hist.length})`} />
                            <div className="relative mt-2">
                              <div className="absolute left-3 top-0 bottom-0 w-px bg-white/[0.06]" />
                              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-hide">
                                {[...hist].reverse().map((h, i) => (
                                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="relative flex items-start gap-4 pl-8">
                                    <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black z-10 border
                                      ${i===0 ? "bg-amber-500 border-amber-400 text-black" : "bg-[#0f1120] border-white/10 text-[#4a5580]"}`}>
                                      {i===0 ? "★" : "↑"}
                                    </div>
                                    <div className={`flex-1 min-w-0 rounded-2xl p-3 border
                                      ${i===0 ? "bg-amber-500/6 border-amber-500/15" : "bg-white/[0.03] border-white/[0.06]"}`}>
                                      <div className="flex flex-wrap justify-between items-start gap-1">
                                        <div>
                                          <p className={`font-black text-base ${i===0?"text-amber-400":"text-white"}`}>
                                            {fmtAmt(h.salary)}<span className="text-xs font-normal text-[#4a5580] ml-1">/din</span>
                                          </p>
                                          <p className="text-[#4a5580] text-xs mt-0.5">{h.reason || "Update"}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-[#4a5580] text-xs font-mono">{fmtDate(h.from)}</p>
                                          {i===0 && <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold inline-block mt-1">CURRENT</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── AttendanceCalendar ───────────────────────────────────────────
function AttendanceCalendar({ month, present, absent }) {
  const [year, mon] = month.split("-").map(Number);
  const firstDay    = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();
  const preSet = new Set(present);
  const absSet = new Set(absent);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S","M","T","W","T","F","S"].map((d,i) => (
          <div key={i} className="text-center text-[10px] text-[#3d4870] font-bold py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array(firstDay).fill(null).map((_,i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_,i) => {
          const day  = i + 1;
          const date = `${year}-${String(mon).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isPre = preSet.has(date), isAbs = absSet.has(date), isTdy = date === TODAY;
          return (
            <motion.div key={date}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.01, type: "spring", stiffness: 280, damping: 20 }}
              className={`aspect-square flex items-center justify-center text-xs font-bold rounded-xl
                ${isPre ? "bg-emerald-500/22 text-emerald-400 border border-emerald-500/20"
                : isAbs ? "bg-red-500/18 text-red-400 border border-red-500/15"
                : isTdy ? "border-2 border-amber-400/50 text-amber-400"
                : "text-[#2c3455]"}`}
            >{day}</motion.div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        {[
          { cls:"bg-emerald-500/22 border border-emerald-500/20", label:"Present" },
          { cls:"bg-red-500/18 border border-red-500/15",         label:"Absent"  },
          { cls:"border-2 border-amber-400/50",                   label:"Aaj"     },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-lg ${l.cls}`} />
            <span className="text-[10px] text-[#3d4870]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DateChips ────────────────────────────────────────────────────
function DateChips({ dates, cls, empty }) {
  if (!dates?.length) return <p className="text-[#3d4870] text-xs text-center py-3">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {[...dates].sort().map(d => (
        <motion.span key={d} initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${cls}`}>
          {fmtShort(d)}
        </motion.span>
      ))}
    </div>
  );
}

// ── FullLoader ───────────────────────────────────────────────────
function FullLoader() {
  return (
    <div className="min-h-screen bg-[#080a12] flex flex-col items-center justify-center gap-4">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        className="w-10 h-10 border-2 border-blue-400/15 border-t-blue-400 rounded-full" />
      <p className="text-[#3d4870] text-sm">Loading...</p>
    </div>
  );
}