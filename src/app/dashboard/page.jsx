"use client";
// src/app/dashboard/page.jsx

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import SkeletonLoader from "@/components/SkeletonLoader";
import ThemeToggle from "@/components/ThemeToggle"; // ✅ NEW

import OrdersSection    from "@/components/OrdersSection";
import PendingOrders    from "@/components/OrdersMain";
import IncomeSection    from "@/components/IncomeSection";
import ProfileSection   from "@/components/profitSection";
import GoodsInStock     from "@/components/goodsInStock";
import AllExpenseSummery from "@/components/AllExpenseSummery";
import RepairingSection from "@/components/RepairingSection";

const NAV = [
  { id: "orders",    label: "New Order", icon: "🔨", accent: "#f59e0b" },
  { id: "repairing", label: "Repairing", icon: "🔧", accent: "#a855f7" },
  { id: "pending",   label: "Orders",    icon: "⏳", accent: "#f97316" },
  { id: "iron",      label: "Stock",     icon: "⚙️", accent: "#3b82f6" },
  { id: "expense",   label: "Expenses",  icon: "💸", accent: "#ef4444" },
  { id: "income",    label: "Income",    icon: "💰", accent: "#10b981" },
  { id: "profit",    label: "Profit",    icon: "📈", accent: "#f59e0b" },
];

const SECTION_META = {
  orders:    { label: "Naya Work Order",   icon: "🔨", accent: "#f59e0b" },
  income:    { label: "Income Details",    icon: "💰", accent: "#10b981" },
  profit:    { label: "Profit Report",     icon: "📈", accent: "#f59e0b" },
  iron:      { label: "Iron in Stock",     icon: "⚙️", accent: "#3b82f6" },
  pending:   { label: "Pending Orders",    icon: "⏳", accent: "#f97316" },
  expense:   { label: "Expense Summary",   icon: "💸", accent: "#ef4444" },
  repairing: { label: "Repairing Income",  icon: "🔧", accent: "#a855f7" },
};

const SECTION_COMPONENTS = {
  orders:    { Component: OrdersSection,    label: "New Order Section",      skeleton: "orders"    },
  income:    { Component: IncomeSection,    label: "Income Section",         skeleton: "income"    },
  profit:    { Component: ProfileSection,   label: "Profit Section",         skeleton: "profit"    },
  iron:      { Component: GoodsInStock,     label: "Stock Section",          skeleton: "stock"     },
  pending:   { Component: PendingOrders,    label: "Pending Orders Section", skeleton: "pending"   },
  expense:   { Component: AllExpenseSummery, label: "Expense Section",       skeleton: "expense"   },
  repairing: { Component: RepairingSection, label: "Repairing Section",      skeleton: "repairing" },
};

function SideNavItem({ item, active, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200"
      style={{ background: active ? `${item.accent}12` : "transparent", border: active ? `1px solid ${item.accent}30` : "1px solid transparent" }}>
      <span className="text-xl leading-none">{item.icon}</span>
      <span className="text-sm font-bold" style={{ color: active ? item.accent : "#4a5580" }}>{item.label}</span>
      {active && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.accent }} />}
    </button>
  );
}

function BgGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
    </div>
  );
}

function MobileTabBar({ active, onChange }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden flex overflow-x-auto"
      style={{ background: "#080a14", borderTop: "1px solid #1e2235" }}>
      {NAV.map((item) => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onChange(item.id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 min-w-[48px]">
            <motion.span animate={{ scale: isActive ? 1.2 : 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="text-lg leading-none">{item.icon}</motion.span>
            <span className="text-[8px] font-black uppercase whitespace-nowrap"
              style={{ color: isActive ? item.accent : "#2e3248" }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen bg-[#06080f] flex flex-col items-center justify-center gap-4">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full" />
      {message && <p className="text-gray-500 text-sm">{message}</p>}
    </div>
  );
}

export default function Dashboard() {
  useProtectedRoute({ roles: ["SuperAdmin"] });
  const { admin, loading, logout } = useAuth();

  const [activeSection,     setActiveSection]     = useState("orders");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleNav = useCallback((id) => setActiveSection(id), []);

  if (loading) return <LoadingScreen message="Loading..." />;
  if (!admin)  return <LoadingScreen message="Redirecting..." />;

  const { Component: ActiveSection, label: sectionLabel, skeleton: skeletonType } = SECTION_COMPONENTS[activeSection];
  const meta   = SECTION_META[activeSection];
  const accent = meta.accent;

  return (
    <div className="min-h-screen bg-[#06080f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <BgGrid />
      <div className="relative z-10 lg:flex">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 sticky top-0 h-screen border-r border-[#1e2235]"
          style={{ background: "#06080f" }}>

          <div className="px-5 py-5 flex-shrink-0 border-b border-[#1e2235]">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#2e3248] mb-0.5">Control Panel</p>
            <p className="text-white font-black text-sm">Fabri<span className="text-amber-400">Core</span></p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV.map((item) => (
              <SideNavItem key={item.id} item={item} active={activeSection === item.id} onClick={() => handleNav(item.id)} />
            ))}
          </nav>

          <div className="flex-shrink-0 border-t border-[#1e2235]">
            {/* ✅ NEW: Theme Toggle */}
            <div className="px-3 pt-3">
              <ThemeToggle expanded />
            </div>

            <div className="px-3 pt-2 pb-1">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 text-red-400 hover:text-red-300"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <span className="text-base">🚪</span>Logout
              </motion.button>
            </div>

            <div className="px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-black font-black text-sm flex-shrink-0"
                  style={{ background: "#f59e0b" }}>
                  {admin.name?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-bold truncate">{admin.name}</p>
                  <p className="text-[10px] text-amber-400/70 font-semibold">{admin.role}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-screen p-4 lg:p-8 pb-24">

          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-white text-xl font-bold flex items-center gap-2">
                <span>{meta.icon}</span>{meta.label}
              </h2>
              <div className="h-[2px] mt-2 w-16" style={{ background: accent }} />
            </div>
            {/* ✅ Mobile mein header mein toggle */}
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <ErrorBoundary key={activeSection} label={sectionLabel}>
                <React.Suspense fallback={<SkeletonLoader type={skeletonType} />}>
                  <ActiveSection />
                </React.Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileTabBar active={activeSection} onChange={handleNav} />

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={e => e.stopPropagation()}
                className="bg-[#0d0f1e] border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">🚪</div>
                </div>
                <p className="text-white font-bold text-center text-base mb-1">Logout Karna Chahte Ho?</p>
                <p className="text-gray-500 text-sm text-center mb-5">{admin.name} — {admin.role}</p>
                <div className="flex gap-3">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={logout}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.25)" }}>
                    Haan, Logout
                  </motion.button>
                  <button onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition text-sm font-semibold">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}