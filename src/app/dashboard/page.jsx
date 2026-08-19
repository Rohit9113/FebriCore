"use client";
// src/app/dashboard/page.jsx
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useProtectedRoute from "@/hooks/useProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ThemeToggle from "@/components/ThemeToggle";
import EmployeeSalaryManager from "@/components/AllExpenseSummery";
import CustomerDueManager from "@/components/CustomerDueManager";
import RentManager from "@/components/RentManager";

// ── Nav config ────────────────────────────────────────────────────
const NAV = [
  { id: "employees", label: "Employees",    icon: "👷", accent: "#f59e0b" },
  { id: "due",       label: "Customer Due", icon: "💰", accent: "#10b981" },
  { id: "rent",      label: "Room Rent",    icon: "🏠", accent: "#a855f7" },
];

function BgGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen bg-[#06080f] flex flex-col items-center justify-center gap-4">
      <motion.div animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full" />
      {message && <p className="text-gray-500 text-sm">{message}</p>}
    </div>
  );
}

export default function Dashboard() {
  useProtectedRoute({ roles: ["SuperAdmin"] });
  const { admin, loading, logout } = useAuth();
  const [activeTab,         setActiveTab]         = useState("employees");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (loading) return <LoadingScreen message="Loading..." />;
  if (!admin)  return <LoadingScreen message="Redirecting..." />;

  const activeNav = NAV.find((n) => n.id === activeTab);

  return (
    <div className="min-h-screen bg-[#06080f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <BgGrid />

      <div className="relative z-10">

        {/* ── Top Header ───────────────────────────────────────── */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-[#1e2235]"
          style={{ background: "#06080f" }}>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-black font-black text-sm"
              style={{ background: "#f59e0b" }}>F</div>
            <span className="text-white font-black text-lg tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              Fabri<span style={{ color: "#f59e0b" }}>Core</span>
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1e2235] bg-white/[0.02]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-black font-black text-xs"
                style={{ background: "#f59e0b" }}>
                {admin.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-none">{admin.name}</p>
                <p className="text-amber-400/70 text-[10px] font-semibold">{admin.role}</p>
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-400 transition-all"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <span>🚪</span>
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </header>

        {/* ── Desktop Tab Bar ───────────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-1 px-8 pt-5 pb-0">
          {NAV.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all"
                style={{
                  background:  isActive ? "#0d0f1e" : "transparent",
                  color:       isActive ? item.accent : "#4a5580",
                  border:      isActive ? `1px solid #1e2235` : "1px solid transparent",
                  borderBottom: isActive ? "1px solid #0d0f1e" : "1px solid transparent",
                  marginBottom: isActive ? "-1px" : "0",
                }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <motion.div layoutId="tabIndicator"
                    className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                    style={{ background: item.accent }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Mobile Top Tab Bar ────────────────────────────────── */}
        <div className="flex lg:hidden border-b border-[#1e2235]"
          style={{ background: "#06080f" }}>
          {NAV.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className="relative flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black uppercase tracking-wide transition-all">
                <motion.span animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="text-base leading-none">{item.icon}</motion.span>
                <span style={{ color: isActive ? item.accent : "#2e3248" }}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div layoutId="mobileIndicator"
                    className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                    style={{ background: item.accent }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Main Content ──────────────────────────────────────── */}
        <main className="px-4 py-5 lg:px-8 lg:pt-6 pb-8"
          style={{ borderTop: "1px solid #1e2235" }}>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}>

              {activeTab === "employees" && (
                <ErrorBoundary label="Employee Manager">
                  <React.Suspense fallback={<SectionLoader />}>
                    <EmployeeSalaryManager />
                  </React.Suspense>
                </ErrorBoundary>
              )}

              {activeTab === "due" && (
                <ErrorBoundary label="Customer Due Manager">
                  <React.Suspense fallback={<SectionLoader />}>
                    <CustomerDueManager />
                  </React.Suspense>
                </ErrorBoundary>
              )}

              {activeTab === "rent" && (
                <ErrorBoundary label="Room Rent Manager">
                  <React.Suspense fallback={<SectionLoader />}>
                    <RentManager />
                  </React.Suspense>
                </ErrorBoundary>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Logout Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()}
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

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <motion.div animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full" />
    </div>
  );
}