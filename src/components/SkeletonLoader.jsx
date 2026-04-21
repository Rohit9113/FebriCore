"use client";
// src/components/SkeletonLoader.jsx
//
// ✅ FIX 28: Loading Skeletons — spinner ki jagah proper placeholders
//
// Usage:
//   <SkeletonLoader type="orders" />       → OrdersSection
//   <SkeletonLoader type="income" />       → IncomeSection
//   <SkeletonLoader type="profit" />       → profitSection
//   <SkeletonLoader type="stock" />        → goodsInStock
//   <SkeletonLoader type="pending" />      → OrdersMain (tabs)
//   <SkeletonLoader type="expense" />      → AllExpenseSummery
//   <SkeletonLoader type="repairing" />    → RepairingSection
//   <SkeletonLoader type="employees" />    → Employee list
//   <SkeletonLoader type="dashboard" />    → Generic dashboard stats
//
// Standalone primitives bhi export hain:
//   <Shimmer />            → base shimmer div
//   <SkeletonCard />       → stat card skeleton
//   <SkeletonRow />        → table row skeleton
//   <SkeletonChart />      → chart area skeleton

import React from "react";

// ─── Base Shimmer ─────────────────────────────────────────────────
// Sab skeletons isi base pe hain — shimmer animation CSS se
export function Shimmer({ className = "", style = {}, rounded = "rounded-xl" }) {
  return (
    <div
      className={`${rounded} ${className} overflow-hidden relative`}
      style={{
        background: "#0c0e1a",
        border:     "1px solid #1a1d2e",
        ...style,
      }}
    >
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0"
        style={{
          background:  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation:   "shimmerSweep 1.8s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes shimmerSweep {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────────────
export function SkeletonCard({ accent = "#1e2235", delay = 0 }) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{
        background:  "#0c0e1a",
        border:      "1px solid #1a1d2e",
        animation:   `skFade 0.4s ease both`,
        animationDelay: `${delay}s`,
      }}
    >
      <style>{`@keyframes skFade { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }`}</style>
      {/* Label row */}
      <div className="flex items-start justify-between mb-4">
        <Shimmer className="h-2.5 w-16" />
        <Shimmer className="w-8 h-8" rounded="rounded-xl" />
      </div>
      {/* Value */}
      <Shimmer className="h-7 w-28 mb-2" />
      {/* Sub */}
      <Shimmer className="h-2 w-20 mb-4" />
      {/* Bottom bar */}
      <Shimmer className="h-0.5 w-full" rounded="rounded-full" />
    </div>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────
export function SkeletonRow({ cols = 5, delay = 0 }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        animation:    `skFade 0.4s ease both`,
        animationDelay: `${delay}s`,
      }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <Shimmer
          key={i}
          className="h-3 flex-1"
          style={{ maxWidth: i === 0 ? "140px" : i === cols - 1 ? "80px" : "100px" }}
        />
      ))}
    </div>
  );
}

// ─── Chart Area Skeleton ──────────────────────────────────────────
export function SkeletonChart({ height = 200 }) {
  // Fake bars at varying heights
  const bars = [60, 85, 45, 92, 70, 55, 80, 65, 90, 50, 75, 88];
  return (
    <div
      className="rounded-2xl p-4 overflow-hidden"
      style={{ background: "#0c0e1a", border: "1px solid #1a1d2e", height }}
    >
      <div className="flex items-end justify-between gap-2 h-full pb-2">
        {bars.map((h, i) => (
          <Shimmer
            key={i}
            rounded="rounded-lg"
            className="flex-1"
            style={{
              height:           `${h}%`,
              animationDelay:   `${i * 0.08}s`,
              minWidth:         "12px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Mobile Card Skeleton ─────────────────────────────────────────
export function SkeletonMobileCard({ delay = 0 }) {
  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ background: "#0c0e1a", border: "1px solid #1a1d2e", animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shimmer className="w-2 h-2" rounded="rounded-full" />
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-7 w-16" rounded="rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-xl p-3" style={{ background: "#080a12", border: "1px solid #1a1d2e" }}>
            <Shimmer className="h-2 w-8 mb-2" />
            <Shimmer className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Header Skeleton ──────────────────────────────────────
function SkeletonSectionHeader() {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <Shimmer className="h-3 w-24 mb-2" />
        <Shimmer className="h-6 w-40" />
      </div>
      <Shimmer className="h-10 w-32" rounded="rounded-2xl" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION-SPECIFIC SKELETONS
// ═══════════════════════════════════════════════════════════════════

// ─── Orders Section (New Order form) ─────────────────────────────
function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {/* Customer info block */}
      <div className="rounded-2xl p-5" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <Shimmer className="h-3 w-28 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3].map(i => (
            <div key={i} className={i === 3 ? "sm:col-span-2" : ""}>
              <Shimmer className="h-2.5 w-20 mb-2" />
              <Shimmer className="h-11 w-full" rounded="rounded-2xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Order type buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3].map(i => <Shimmer key={i} className="h-12 w-full" rounded="rounded-2xl" />)}
      </div>

      {/* Order entries */}
      {[1,2].map(i => (
        <div key={i} className="rounded-2xl p-4" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
          <div className="flex items-center justify-between mb-3">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-7 w-7" rounded="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(j => (
              <div key={j}>
                <Shimmer className="h-2.5 w-16 mb-2" />
                <Shimmer className="h-11 w-full" rounded="rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Total + Submit */}
      <div className="rounded-2xl p-4 flex justify-between items-center" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-6 w-32" />
      </div>
      <Shimmer className="h-14 w-full" rounded="rounded-2xl" />
    </div>
  );
}

// ─── Income Section ───────────────────────────────────────────────
function IncomeSkeleton() {
  return (
    <div className="space-y-5">
      {/* Toggle + year picker */}
      <div className="flex gap-2">
        <Shimmer className="h-10 flex-1" rounded="rounded-2xl" />
        <Shimmer className="h-10 w-28" rounded="rounded-2xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 0.05, 0.1, 0.15].map((d, i) => <SkeletonCard key={i} delay={d} />)}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <div className="flex items-center justify-between mb-5">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-4 w-20" />
        </div>
        <SkeletonChart height={220} />
        {/* X labels */}
        <div className="flex justify-between mt-2 px-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Shimmer key={i} className="h-2 w-6" />
          ))}
        </div>
      </div>

      {/* Best period card */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <Shimmer className="w-12 h-12" rounded="rounded-2xl" />
        <div className="flex-1">
          <Shimmer className="h-3 w-24 mb-2" />
          <Shimmer className="h-5 w-36" />
        </div>
      </div>
    </div>
  );
}

// ─── Profit Section ───────────────────────────────────────────────
function ProfitSkeleton() {
  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex gap-2">
        <Shimmer className="h-10 flex-1" rounded="rounded-2xl" />
        <Shimmer className="h-10 w-28" rounded="rounded-2xl" />
      </div>

      {/* Stat cards — 2 rows */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 0.05, 0.1, 0.15, 0.2, 0.25].map((d, i) => <SkeletonCard key={i} delay={d} />)}
      </div>

      {/* Stacked bar chart */}
      <div className="rounded-2xl p-5" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <Shimmer className="h-4 w-32 mb-5" />
        <SkeletonChart height={240} />
      </div>

      {/* Cost breakdown donut placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
          <Shimmer className="h-3 w-28 mb-4" />
          <div className="flex items-center justify-center py-4">
            <Shimmer className="w-28 h-28" rounded="rounded-full" />
          </div>
          <div className="space-y-2 mt-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Shimmer className="w-3 h-3" rounded="rounded-full" />
                <Shimmer className="h-2.5 flex-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
          <Shimmer className="h-3 w-28 mb-4" />
          {[1,2,3,4].map(i => (
            <div key={i} className="flex justify-between items-center py-3" style={{ borderBottom: "1px solid #1a1d2e" }}>
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stock Section ────────────────────────────────────────────────
function StockSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 0.05, 0.1, 0.15].map((d, i) => <SkeletonCard key={i} delay={d} />)}
      </div>

      {/* Stock value bar */}
      <div className="rounded-2xl p-4 flex justify-between items-center" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <div>
          <Shimmer className="h-2.5 w-32 mb-2" />
          <Shimmer className="h-6 w-28" />
        </div>
        <div className="text-right">
          <Shimmer className="h-2.5 w-20 mb-2" />
          <Shimmer className="h-4 w-24" />
        </div>
      </div>

      {/* Distribution bar */}
      <div className="rounded-2xl p-4" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <Shimmer className="h-2.5 w-36 mb-4" />
        <Shimmer className="h-3 w-full mb-3" rounded="rounded-xl" />
        <div className="flex gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <Shimmer className="w-2 h-2" rounded="rounded-full" />
              <Shimmer className="h-2 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2">
        <Shimmer className="h-11 flex-1" rounded="rounded-2xl" />
        <Shimmer className="h-11 w-11" rounded="rounded-2xl" />
        <Shimmer className="h-11 w-36" rounded="rounded-2xl" />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        {/* Header */}
        <div className="flex gap-2 px-4 py-3" style={{ background: "#08090f", borderBottom: "1px solid #1a1d2e" }}>
          {[1,2,3,4,5,6].map(i => <Shimmer key={i} className="h-2.5 flex-1" />)}
        </div>
        {/* Rows */}
        {[0, 0.06, 0.12, 0.18, 0.24].map((d, i) => (
          <SkeletonRow key={i} cols={6} delay={d} />
        ))}
      </div>
    </div>
  );
}

// ─── Pending Orders (tabs) ────────────────────────────────────────
function PendingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2">
        {[1,2,3].map(i => <Shimmer key={i} className="flex-1 h-11" rounded="rounded-xl" />)}
      </div>

      {/* Order cards */}
      {[0, 0.08, 0.16, 0.24].map((d, i) => (
        <div key={i} className="rounded-2xl p-4" style={{
          background: "#0c0e1a", border: "1px solid #1a1d2e",
          animation: `skFade 0.4s ease both`, animationDelay: `${d}s`,
        }}>
          {/* Customer row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Shimmer className="w-10 h-10" rounded="rounded-2xl" />
              <div>
                <Shimmer className="h-3.5 w-28 mb-1.5" />
                <Shimmer className="h-2.5 w-20" />
              </div>
            </div>
            <Shimmer className="h-6 w-20" rounded="rounded-xl" />
          </div>

          {/* Order items */}
          <div className="space-y-2 mb-3">
            {[1, 2].map(j => (
              <div key={j} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "#080a12", border: "1px solid #1a1d2e" }}>
                <Shimmer className="h-2.5 w-16" />
                <Shimmer className="h-2.5 flex-1" />
                <Shimmer className="h-2.5 w-20" />
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Shimmer className="h-9 flex-1" rounded="rounded-xl" />
            <Shimmer className="h-9 flex-1" rounded="rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Expense Section ──────────────────────────────────────────────
function ExpenseSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 0.06, 0.12, 0.18].map((d, i) => <SkeletonCard key={i} delay={d} />)}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[1,2,3,4,5,6].map(i => <Shimmer key={i} className="h-8 w-20" rounded="rounded-xl" />)}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2">
        <Shimmer className="h-11 flex-1" rounded="rounded-2xl" />
        <Shimmer className="h-11 w-36" rounded="rounded-2xl" />
      </div>

      {/* Expense rows */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <div className="flex gap-2 px-4 py-3" style={{ background: "#08090f", borderBottom: "1px solid #1a1d2e" }}>
          {[1,2,3,4,5].map(i => <Shimmer key={i} className="h-2.5 flex-1" />)}
        </div>
        {[0, 0.06, 0.12, 0.18, 0.24].map((d, i) => (
          <SkeletonRow key={i} cols={5} delay={d} />
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-4" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <Shimmer className="h-3 w-36 mb-4" />
        <SkeletonChart height={180} />
      </div>
    </div>
  );
}

// ─── Repairing Section ────────────────────────────────────────────
function RepairingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 0.06, 0.12, 0.18].map((d, i) => <SkeletonCard key={i} delay={d} />)}
      </div>

      {/* Add form */}
      <div className="rounded-2xl p-4" style={{ background: "#0c0e1a", border: "1px solid #1a1d2e" }}>
        <Shimmer className="h-3 w-28 mb-4" />
        <div className="space-y-3">
          <Shimmer className="h-11 w-full" rounded="rounded-2xl" />
          <Shimmer className="h-11 w-full" rounded="rounded-2xl" />
          <Shimmer className="h-12 w-full" rounded="rounded-2xl" />
        </div>
      </div>

      {/* Entries */}
      {[0, 0.08, 0.16].map((d, i) => (
        <div key={i} className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "#0c0e1a", border: "1px solid #1a1d2e", animationDelay: `${d}s` }}>
          <Shimmer className="w-10 h-10" rounded="rounded-2xl" />
          <div className="flex-1">
            <Shimmer className="h-3 w-36 mb-2" />
            <Shimmer className="h-2.5 w-24" />
          </div>
          <Shimmer className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Employees Section ────────────────────────────────────────────
function EmployeesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 0.05, 0.1, 0.15].map((d, i) => <SkeletonCard key={i} delay={d} />)}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2">
        <Shimmer className="h-11 flex-1" rounded="rounded-2xl" />
        <Shimmer className="h-11 w-36" rounded="rounded-2xl" />
      </div>

      {/* Employee cards */}
      {[0, 0.08, 0.16, 0.24].map((d, i) => (
        <div key={i} className="rounded-2xl p-4" style={{
          background: "#0c0e1a", border: "1px solid #1a1d2e",
          animation: `skFade 0.4s ease both`, animationDelay: `${d}s`,
        }}>
          <div className="flex items-center gap-3 mb-3">
            <Shimmer className="w-12 h-12" rounded="rounded-2xl" />
            <div className="flex-1">
              <Shimmer className="h-4 w-32 mb-2" />
              <Shimmer className="h-2.5 w-20" />
            </div>
            <Shimmer className="h-7 w-16" rounded="rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(j => (
              <div key={j} className="rounded-xl p-2.5" style={{ background: "#080a12" }}>
                <Shimmer className="h-2 w-12 mb-1.5" />
                <Shimmer className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Generic Dashboard Stats ──────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 0.05, 0.1, 0.15].map((d, i) => <SkeletonCard key={i} delay={d} />)}
      </div>
      <SkeletonChart height={200} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1,2].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXPORT — type prop se sahi skeleton select hota hai
// ═══════════════════════════════════════════════════════════════════
const SKELETON_MAP = {
  orders:    OrdersSkeleton,
  income:    IncomeSkeleton,
  profit:    ProfitSkeleton,
  stock:     StockSkeleton,
  pending:   PendingSkeleton,
  expense:   ExpenseSkeleton,
  repairing: RepairingSkeleton,
  employees: EmployeesSkeleton,
  dashboard: DashboardSkeleton,
};

export default function SkeletonLoader({ type = "dashboard" }) {
  const Skeleton = SKELETON_MAP[type] || DashboardSkeleton;
  return (
    <div
      role="status"
      aria-label="Loading..."
      aria-busy="true"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Skeleton />
      {/* Screen reader only */}
      <span className="sr-only">Loading {type} data...</span>
    </div>
  );
}