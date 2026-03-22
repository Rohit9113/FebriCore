"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { useAuth } from "@/context/AuthContext";

import OrdersSection     from "@/components/OrdersSection";
import PendingOrders     from "@/components/PendingOrders";
import IncomeSection     from "@/components/IncomeSection";
import ProfileSection    from "@/components/profitSection";
import GoodsInStock      from "@/components/goodsInStock";
import AllExpenseSummery from "@/components/AllExpenseSummery";

const NAV = [
  { id: "orders",  label: "New Order", icon: "🔨", accent: "#f59e0b" },
  { id: "income",  label: "Income",    icon: "💰", accent: "#10b981" },
  { id: "profit",  label: "Profit",    icon: "📈", accent: "#f59e0b" },
  { id: "iron",    label: "Stock",     icon: "⚙️", accent: "#3b82f6" },
  { id: "pending", label: "Pending",   icon: "⏳", accent: "#f97316" },
  { id: "expense", label: "Expenses",  icon: "💸", accent: "#ef4444" },
];

const SECTION_META = {
  orders:  { label: "Naya Work Order",   icon: "🔨", accent: "#f59e0b" },
  income:  { label: "Income Details",    icon: "💰", accent: "#10b981" },
  profit:  { label: "Profit Report",     icon: "📈", accent: "#f59e0b" },
  iron:    { label: "Iron in Stock",     icon: "⚙️", accent: "#3b82f6" },
  pending: { label: "Pending Orders",    icon: "⏳", accent: "#f97316" },
  expense: { label: "Expense Summary",   icon: "💸", accent: "#ef4444" },
};

/* ── Sidebar item ────────────────────────────────────────────────── */
function SideNavItem({ item, active, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
      style={{
        background: active ? `${item.accent}12` : "transparent",
        border:     active ? `1px solid ${item.accent}30` : "1px solid transparent",
      }}>
      <span className="text-xl">{item.icon}</span>
      <span className="text-sm font-bold" style={{ color: active ? item.accent : "#4a5580" }}>
        {item.label}
      </span>
    </button>
  );
}

/* ── Background ──────────────────────────────────────────────────── */
function BgGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }} />
      <div className="absolute -top-40 left-1/4 w-[800px] h-[600px] rounded-full blur-[180px] opacity-[0.05]"
        style={{ background: "#f59e0b" }} />
      <div className="absolute bottom-0 right-0 w-[600px] h-[500px] rounded-full blur-[160px] opacity-[0.04]"
        style={{ background: "#3b82f6" }} />
    </div>
  );
}

/* ── Mobile tab bar ──────────────────────────────────────────────── */
function MobileTabBar({ active, onChange }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden flex"
      style={{ background: "#080a14", borderTop: "1px solid #1e2235" }}>
      {NAV.map((item) => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onChange(item.id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 relative">
            {isActive && (
              <motion.div layoutId="tab-line"
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ background: item.accent }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
            <motion.span animate={{ scale: isActive ? 1.2 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="text-lg leading-none">{item.icon}</motion.span>
            <span className="text-[9px] font-black uppercase"
              style={{ color: isActive ? item.accent : "#2e3248" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  useProtectedRoute({ roles: ["SuperAdmin"] });
  const { admin } = useAuth();

  // ── ALL HOOKS FIRST ──────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState("orders");
  const contentRef = useRef(null);

  const handleNav = useCallback((id) => {
    setActiveSection(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, []);

  // ── Guard — after all hooks ──────────────────────────────────────
  if (!admin) {
    return (
      <div className="min-h-screen bg-[#06080f] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full" />
      </div>
    );
  }

  // ── Section map — after hooks & guard ───────────────────────────
  const SECTION_MAP = {
    orders:  <OrdersSection />,
    income:  <IncomeSection />,
    profit:  <ProfileSection />,
    iron:    <GoodsInStock />,
    pending: <PendingOrders />,
    expense: <AllExpenseSummery />,
  };

  const meta   = SECTION_META[activeSection];
  const accent = meta.accent;

  return (
    <div className="min-h-screen bg-[#06080f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <BgGrid />

      <div className="relative z-10 lg:flex min-h-screen pt-16">

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-16 h-[calc(100vh-64px)]"
          style={{ borderRight: "1px solid #1e2235" }}>

          {/* Brand */}
          <div className="px-5 py-5" style={{ borderBottom: "1px solid #1e2235" }}>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#2e3248] mb-0.5">Control Panel</p>
            <p className="text-white font-black text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
              Fabri<span className="text-amber-400">Core</span>
            </p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV.map((item) => (
              <SideNavItem key={item.id} item={item}
                active={activeSection === item.id}
                onClick={() => handleNav(item.id)} />
            ))}
          </nav>

          {/* Admin info */}
          <div className="px-4 py-4" style={{ borderTop: "1px solid #1e2235" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-base flex-shrink-0">
                {admin.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xs truncate">{admin.name}</p>
                <p className="text-amber-400 text-[10px]">{admin.role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-8">

          {/* Section header bar */}
          <div className="sticky top-16 z-30 flex items-center justify-between px-4 lg:px-6 py-3"
            style={{ background: "rgba(6,8,15,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid #1e2235" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                {meta.icon}
              </div>
              <h2 className="text-white font-black text-base" style={{ fontFamily: "'Syne', sans-serif" }}>
                {meta.label}
              </h2>
            </div>

            {/* Quick nav pills - desktop */}
            <div className="hidden lg:flex items-center gap-1.5">
              {NAV.filter(n => n.id !== activeSection).slice(0, 4).map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.92 }}
                  onClick={() => handleNav(item.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "#0c0e1a", border: "1px solid #1e2235", color: "#4a5580" }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Section content */}
          <div ref={contentRef}>
            <AnimatePresence mode="wait">
              <motion.div key={activeSection}
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
                exit={{   opacity: 0, y: -10, filter: "blur(3px)" }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                {SECTION_MAP[activeSection]}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile tab bar */}
      <MobileTabBar active={activeSection} onChange={handleNav} />
    </div>
  );
}