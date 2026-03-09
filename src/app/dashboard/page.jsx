"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import OrdersSection from "@/components/OrdersSection";
import PendingOrders from "@/components/PendingOrders";
import IncomeSection from "@/components/IncomeSection";
import ProfileSection from "@/components/profitSection";
import GoodsInStock from "@/components/goodsInStock";
import AllExpenseSummery from "@/components/AllExpenseSummery";

// ═══════════════════════════════════════════════════════════
// CONFIG — stat cards
// ═══════════════════════════════════════════════════════════
const CARDS = [
  {
    id: "income",
    label: "Total Income",
    value: "1,24,500",
    prefix: "₹",
    icon: "💰",
    accent: "#10b981",
    accentDim: "#10b98118",
    accentBorder: "#10b98130",
    glyph: "INCOME",
    trend: "+12.4%",
    trendUp: true,
  },
  {
    id: "profit",
    label: "Net Profit",
    value: "38,200",
    prefix: "₹",
    icon: "📈",
    accent: "#f59e0b",
    accentDim: "#f59e0b18",
    accentBorder: "#f59e0b30",
    glyph: "PROFIT",
    trend: "+8.1%",
    trendUp: true,
  },
  {
    id: "iron",
    label: "Iron Stock",
    value: "2,340",
    suffix: " Kg",
    icon: "⚙️",
    accent: "#3b82f6",
    accentDim: "#3b82f618",
    accentBorder: "#3b82f630",
    glyph: "STOCK",
    trend: "-3.2%",
    trendUp: false,
  },
  {
    id: "pending",
    label: "Pending",
    value: "17",
    icon: "⏳",
    accent: "#f97316",
    accentDim: "#f9731618",
    accentBorder: "#f9731630",
    glyph: "ORDERS",
    trend: "+5",
    trendUp: false,
  },
  {
    id: "expense",
    label: "Expenses",
    value: "86,300",
    prefix: "₹",
    icon: "💸",
    accent: "#ef4444",
    accentDim: "#ef444418",
    accentBorder: "#ef444430",
    glyph: "EXPENSE",
    trend: "-2.8%",
    trendUp: true,
  },
];

const NAV = [
  { id: "orders",  label: "New Order",  icon: "🔨", shortLabel: "Order"   },
  { id: "income",  label: "Income",     icon: "💰", shortLabel: "Income"  },
  { id: "profit",  label: "Profit",     icon: "📈", shortLabel: "Profit"  },
  { id: "iron",    label: "Stock",      icon: "⚙️", shortLabel: "Stock"   },
  { id: "pending", label: "Pending",    icon: "⏳", shortLabel: "Pending" },
  { id: "expense", label: "Expenses",   icon: "💸", shortLabel: "Expense" },
];

// ═══════════════════════════════════════════════════════════
// 🔢 COUNTER — animates number on mount
// ═══════════════════════════════════════════════════════════
function Counter({ value, prefix = "", suffix = "", accent, active }) {
  const [display, setDisplay] = useState("0");
  const target   = parseInt(value.replace(/,/g, ""), 10) || 0;
  const doneRef  = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const dur  = 1200;
    const fps  = 60;
    const steps = (dur / 1000) * fps;
    let cur = 0;
    const inc = target / steps;
    const timer = setInterval(() => {
      cur = Math.min(cur + inc, target);
      setDisplay(Math.floor(cur).toLocaleString("en-IN"));
      if (cur >= target) clearInterval(timer);
    }, 1000 / fps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="font-black tabular-nums" style={{ color: active ? accent : "#fff" }}>
      {prefix}{display}{suffix}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// 📡 SCAN LINE — radar sweep animation
// ═══════════════════════════════════════════════════════════
function ScanLine({ accent }) {
  return (
    <motion.div
      initial={{ top: "0%", opacity: 0.6 }}
      animate={{ top: ["0%", "100%", "0%"], opacity: [0.6, 0.2, 0.6] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }}
    />
  );
}

// ═══════════════════════════════════════════════════════════
// 🃏 STAT CARD — 3D tilt + scan + counter
// ═══════════════════════════════════════════════════════════
function StatCard({ card, active, onClick, index }) {
  const ref    = useRef(null);
  const rotX   = useSpring(0, { stiffness: 250, damping: 28 });
  const rotY   = useSpring(0, { stiffness: 250, damping: 28 });
  const glowX  = useSpring(50, { stiffness: 150, damping: 22 });
  const glowY  = useSpring(50, { stiffness: 150, damping: 22 });
  const glowBg = useTransform([glowX, glowY], ([x, y]) =>
    `radial-gradient(circle at ${x}% ${y}%, ${card.accent}22 0%, transparent 65%)`
  );

  const onMove = useCallback((e) => {
    const r  = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top)  / r.height;
    rotX.set((py - 0.5) * -16);
    rotY.set((px - 0.5) *  16);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }, [rotX, rotY, glowX, glowY]);

  const onLeave = useCallback(() => {
    rotX.set(0); rotY.set(0); glowX.set(50); glowY.set(50);
  }, [rotX, rotY, glowX, glowY]);

  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 280, damping: 26 }}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 1000 }}
      whileTap={{ scale: 0.95 }}
      className="relative cursor-pointer rounded-2xl overflow-hidden select-none"
    >
      {/* Border glow when active */}
      <motion.div
        animate={{
          opacity: active ? 1 : 0,
          boxShadow: active ? `0 0 0 1.5px ${card.accent}60, 0 8px 40px ${card.accent}20` : "none",
        }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 rounded-2xl pointer-events-none z-20"
      />

      {/* Card body */}
      <motion.div
        animate={{ background: active ? card.accentDim : "#0c0e1a" }}
        transition={{ duration: 0.3 }}
        className="relative p-4 xl:p-5 h-full"
        style={{ border: `1px solid ${active ? card.accentBorder : "#1e2235"}` }}
      >
        {/* Cursor-tracked glow */}
        <motion.div style={{ background: glowBg }}
          className="absolute inset-0 rounded-2xl pointer-events-none" />

        {/* Scan line */}
        {active && <ScanLine accent={card.accent} />}

        {/* Top: label + trend */}
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-0.5"
              style={{ color: active ? card.accent : "#2e3248" }}>
              {card.glyph}
            </p>
            <p className="text-xs text-[#4a5580] font-medium">{card.label}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <motion.span
              animate={{ scale: active ? [1, 1.12, 1] : 1 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              className="text-2xl leading-none"
            >{card.icon}</motion.span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md`}
              style={{
                background: card.trendUp ? "#10b98118" : "#ef444418",
                color: card.trendUp ? "#10b981" : "#ef4444",
              }}>
              {card.trend}
            </span>
          </div>
        </div>

        {/* Value */}
        <div className="relative z-10" style={{ fontSize: "clamp(1.1rem, 2vw, 1.5rem)" }}>
          <Counter
            value={card.value}
            prefix={card.prefix}
            suffix={card.suffix}
            accent={card.accent}
            active={active}
          />
        </div>

        {/* Bottom indicator bar */}
        <div className="mt-3 h-0.5 rounded-full overflow-hidden bg-white/[0.04] relative z-10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: active ? "100%" : "35%" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            style={{ background: `linear-gradient(90deg, ${card.accent}, ${card.accent}44)` }}
            className="h-full rounded-full"
          />
        </div>

        {/* Active dot */}
        {active && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full z-20"
            style={{ background: card.accent, boxShadow: `0 0 8px ${card.accent}` }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🕹️ SIDEBAR NAV ITEM (desktop)
// ═══════════════════════════════════════════════════════════
function SideNavItem({ item, active, onClick, accent }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors group"
      style={{
        background: active ? `${accent}12` : "transparent",
        border: active ? `1px solid ${accent}30` : "1px solid transparent",
      }}
    >
      {/* Active bar */}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="sidebar-active"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
            style={{ background: accent }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <span className="text-xl w-7 text-center flex-shrink-0 transition-transform group-hover:scale-110">
        {item.icon}
      </span>
      <span
        className="text-sm font-bold transition-colors"
        style={{ color: active ? accent : "#4a5580" }}
      >
        {item.label}
      </span>

      {/* Hover line */}
      {!active && (
        <motion.div
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          style={{ originX: 0 }}
          className="absolute bottom-1 left-4 right-4 h-px bg-white/5"
        />
      )}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════
// 📟 SECTION HEADER — appears above content
// ═══════════════════════════════════════════════════════════
function SectionHeader({ section, accent, label, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 mb-5 pb-4"
      style={{ borderBottom: "1px solid #1e2235" }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        {icon}
      </motion.div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em]"
          style={{ color: accent }}>SECTION</p>
        <h2 className="text-white font-black text-lg leading-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}>{label}</h2>
      </div>
      {/* Decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ originX: 0, background: `linear-gradient(90deg, ${accent}40, transparent)` }}
        className="flex-1 h-px ml-3"
      />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🌐 BG GRID
// ═══════════════════════════════════════════════════════════
function BgGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      {/* Ambient glows */}
      <motion.div
        animate={{ opacity: [0.04, 0.08, 0.04] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 left-1/4 w-[800px] h-[600px] rounded-full blur-[180px]"
        style={{ background: "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)" }}
      />
      <motion.div
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-0 right-0 w-[600px] h-[500px] rounded-full blur-[160px]"
        style={{ background: "radial-gradient(ellipse, #3b82f6 0%, transparent 70%)" }}
      />
      {/* Top corner decorative lines */}
      <svg className="absolute top-0 right-0 opacity-[0.06] w-96 h-96" viewBox="0 0 400 400">
        {[0,1,2,3,4].map(i => (
          <line key={i} x1={400} y1={0} x2={i*80} y2={400}
            stroke="#f59e0b" strokeWidth="0.5" />
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔔 WELCOME BANNER
// ═══════════════════════════════════════════════════════════
function WelcomeBanner({ name }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Suprabhat" : hour < 17 ? "Namaskar" : "Shubh Sandhya";
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between mb-6 flex-wrap gap-3"
    >
      <div>
        <motion.p
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/60 mb-1"
        >
          {greeting} 👋
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18 }}
          className="text-white font-black text-2xl sm:text-3xl leading-tight"
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
        >
          {name || "Admin"} <span className="text-amber-400">⚡</span>
        </motion.h1>
      </div>

      {/* Live clock */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-end"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        <p className="text-white font-black text-xl tabular-nums leading-tight">
          {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
        </p>
        <p className="text-[#3d4260] text-[10px] font-medium">
          {time.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📱 MOBILE BOTTOM TAB BAR
// ═══════════════════════════════════════════════════════════
function MobileTabBar({ active, onChange }) {
  const getAccent = (id) => {
    if (id === "orders") return "#f59e0b";
    return CARDS.find(c => c.id === id)?.accent || "#f59e0b";
  };

  return (
    <motion.div
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.4 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ background: "#080a14", borderTop: "1px solid #1e2235" }}
    >
      <div className="flex items-center px-1 py-2 safe-bottom">
        {NAV.map(item => {
          const isActive = active === item.id;
          const accent   = getAccent(item.id);
          return (
            <motion.button
              key={item.id}
              onClick={() => onChange(item.id)}
              whileTap={{ scale: 0.88 }}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors relative"
              style={{ background: isActive ? `${accent}12` : "transparent" }}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-dot"
                  className="absolute top-1 w-4 h-0.5 rounded-full"
                  style={{ background: accent }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                animate={{ scale: isActive ? 1.2 : 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="text-lg leading-none"
              >{item.icon}</motion.span>
              <span className="text-[9px] font-black uppercase tracking-wide"
                style={{ color: isActive ? accent : "#2e3248" }}>
                {item.shortLabel}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// ✨ MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
export default function Dashboard() {
  useProtectedRoute({ roles: ["SuperAdmin"] });
  const { admin } = useAuth();
  const [activeSection, setActiveSection] = useState("orders");
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  if (!admin) return null;

  const getActiveCard = () => CARDS.find(c => c.id === activeSection);
  const activeCard    = getActiveCard();
  const accent        = activeCard?.accent || "#f59e0b";

  const SECTION_MAP = {
    orders:  { component: <OrdersSection />,    label: "Naya Work Order",   icon: "🔨", accent: "#f59e0b" },
    income:  { component: <IncomeSection />,    label: "Income Details",  icon: "💰", accent: "#10b981" },
    profit:  { component: <ProfileSection />,   label: "Profit Report",   icon: "📈", accent: "#f59e0b" },
    iron:    { component: <GoodsInStock />,     label: "Iron in Stock",   icon: "⚙️", accent: "#3b82f6" },
    pending: { component: <PendingOrders />,    label: "Pending Orders",  icon: "⏳", accent: "#f97316" },
    expense: { component: <AllExpenseSummery />,label: "Expense Summary", icon: "💸", accent: "#ef4444" },
  };

  const currentSection = SECTION_MAP[activeSection];

  const handleNav = useCallback((id) => {
    setActiveSection(id);
    // Scroll to content on mobile
    if (window.innerWidth < 1024) {
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#06080f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <BgGrid />

      {/* ═══ DESKTOP LAYOUT ════════════════════════════════
          [64px navbar] + [220px sidebar | main content]
      ═══════════════════════════════════════════════════ */}
      <div className="relative z-10 flex min-h-screen pt-16">

        {/* ── SIDEBAR (desktop only) ─────────────────────── */}
        <motion.aside
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col w-[220px] xl:w-[240px] flex-shrink-0 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto"
          style={{ borderRight: "1px solid #1e2235" }}
        >
          {/* Logo */}
          <div className="px-4 py-5" style={{ borderBottom: "1px solid #1e2235" }}>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#2e3248] mb-1">Control Panel</p>
            <p className="text-white font-black text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
              Fabri<span className="text-amber-400">Core</span>
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map((item) => {
              const a = item.id === "orders" ? "#f59e0b" : CARDS.find(c => c.id === item.id)?.accent || "#f59e0b";
              return (
                <SideNavItem
                  key={item.id}
                  item={item}
                  active={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                  accent={a}
                />
              );
            })}
          </nav>

          {/* Admin info at bottom */}
          <div className="px-4 py-4" style={{ borderTop: "1px solid #1e2235" }}>
            <div className="flex items-center gap-2.5">
              <motion.div
                animate={{ boxShadow: ["0 0 8px #f59e0b30", "0 0 18px #f59e0b50", "0 0 8px #f59e0b30"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-base flex-shrink-0"
              >
                {admin.name?.charAt(0)?.toUpperCase() || "A"}
              </motion.div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xs truncate">{admin.name || "Admin"}</p>
                <p className="text-amber-400 text-[10px] font-medium">{admin.role}</p>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* ── MAIN CONTENT ───────────────────────────────── */}
        <main className="flex-1 min-w-0 px-4 lg:px-6 xl:px-8 py-5 pb-28 lg:pb-8">

          {/* Welcome banner — desktop */}
          <div className="hidden lg:block">
            <WelcomeBanner name={admin.name} />
          </div>

          {/* Mobile greeting */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden mb-5"
          >
            <p className="text-white font-black text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              {admin.name} <span className="text-amber-400">⚡</span>
            </p>
            <p className="text-[#2e3248] text-xs">FabriCore Control Panel</p>
          </motion.div>

          {/* ── STAT CARDS GRID ──────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {CARDS.map((card, i) => (
              <StatCard
                key={card.id}
                card={card}
                active={activeSection === card.id}
                onClick={() => handleNav(card.id)}
                index={i}
              />
            ))}
          </div>

          {/* ── QUICK ACTIONS (desktop only, above content) ── */}
          <div className="hidden lg:flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2e3248] flex-shrink-0">Quick:</span>
            {NAV.map(item => {
              const a = item.id === "orders" ? "#f59e0b" : CARDS.find(c => c.id === item.id)?.accent || "#f59e0b";
              const isActive = activeSection === item.id;
              return (
                <motion.button key={item.id} whileTap={{ scale: 0.93 }}
                  onClick={() => setActiveSection(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all"
                  style={{
                    background: isActive ? `${a}18` : "#0c0e1a",
                    border: `1px solid ${isActive ? `${a}40` : "#1e2235"}`,
                    color: isActive ? a : "#4a5580",
                  }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* ── DYNAMIC CONTENT AREA ─────────────────────── */}
          <div ref={contentRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(3px)", scale: 0.99 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Content wrapper with border glow */}
                <div
                  className="rounded-3xl overflow-hidden"
                  style={{
                    background: "#08090f",
                    border: `1px solid ${accent}20`,
                    boxShadow: `0 0 60px ${accent}06, inset 0 1px 0 ${accent}15`,
                  }}
                >
                  {/* Header */}
                  <div className="px-5 pt-5 pb-0 lg:px-6 lg:pt-6">
                    <SectionHeader
                      accent={currentSection.accent}
                      label={currentSection.label}
                      icon={currentSection.icon}
                    />
                  </div>

                  {/* Component — rendered without extra padding so each component controls its own */}
                  <div>
                    {currentSection.component}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────── */}
      <MobileTabBar active={activeSection} onChange={handleNav} />
    </div>
  );
}