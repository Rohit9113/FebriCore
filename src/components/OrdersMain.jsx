"use client";
// src/components/OrdersMain.jsx  (replace PendingOrders.jsx)
//
// Main component — sirf:
//   1. Data fetch karna
//   2. Tab switching
//   3. Toast show karna
//   4. Teen tab components render karna

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import { api, normalizeOrder, normalizeCompleted } from "./orders/orderUtils";
import PendingTab   from "./orders/PendingTab";
import DuesTab      from "./orders/DuesTab";
import CompletedTab from "./orders/CompletedTab";

export default function OrdersMain() {
  const [activeTab,       setActiveTab]       = useState("pending");
  const [pendingOrders,   setPendingOrders]   = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState(null);

  // ── Toast ───────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    try {
      const { data } = await api.get("/orders");
      if (data.success) setPendingOrders(data.data.map(normalizeOrder));
    } catch (err) {
      showToast(err?.response?.data?.error || "Orders load nahi hua", "error");
    }
  }, [showToast]);

  const fetchCompleted = useCallback(async () => {
    try {
      const { data } = await api.get("/orders/complete");
      if (data.success) setCompletedOrders(data.data.map(normalizeCompleted));
    } catch (err) {
      showToast(err?.response?.data?.error || "Completed load nahi hua", "error");
    }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchPending(), fetchCompleted()]);
      setLoading(false);
    })();
  }, [fetchPending, fetchCompleted]);

  // ── Refresh handlers ─────────────────────────────────────────────
  const handlePendingRefresh = useCallback(async () => {
    await Promise.all([fetchPending(), fetchCompleted()]);
  }, [fetchPending, fetchCompleted]);

  const handleDuesRefresh = useCallback(async (movedToCompleted) => {
    await fetchPending();
    if (movedToCompleted) {
      await fetchCompleted();
      setActiveTab("completed"); // auto-switch to completed tab
    }
  }, [fetchPending, fetchCompleted]);

  // ── Computed ─────────────────────────────────────────────────────
  const purePending = pendingOrders.filter(o => o.status !== "Partially Completed");
  const dueOrders   = pendingOrders.filter(o => o.status === "Partially Completed");

  const TABS = [
    {
      key:   "pending",
      label: "⏳ Pending",
      count: purePending.length,
      on:    "bg-amber-500/20 border-amber-500/40 text-amber-300",
    },
    {
      key:   "dues",
      label: "💳 All Dues",
      count: dueOrders.length,
      on:    "bg-orange-500/20 border-orange-500/40 text-orange-300",
    },
    {
      key:   "completed",
      label: "✅ Completed",
      count: completedOrders.length,
      on:    "bg-green-500/20 border-green-500/40 text-green-300",
    },
  ];

  return (
    <div className="pb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:-50, scale:0.95 }}
            animate={{ opacity:1, y:0,   scale:1    }}
            exit={{    opacity:0, y:-30               }}
            transition={{ type:"spring", stiffness:400, damping:28 }}
            className={`fixed top-4 left-4 right-4 z-[200] px-5 py-4 rounded-2xl text-sm font-semibold
                        shadow-2xl flex items-center gap-3
                        ${toast.type === "error"
                          ? "border border-red-500/40 text-red-300"
                          : "border border-green-500/40 text-green-300"}`}
            style={{
              background:    toast.type === "error" ? "rgba(20,5,5,0.97)"  : "rgba(5,20,10,0.97)",
              backdropFilter: "blur(20px)",
            }}>
            <span className="text-lg flex-shrink-0">{toast.type === "error" ? "⚠️" : "✅"}</span>
            <span className="flex-1 leading-snug">{toast.msg}</span>
            <button onClick={() => setToast(null)}
              className="text-gray-500 hover:text-white transition text-base">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 pb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border
              ${activeTab === t.key ? t.on : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 opacity-70">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Orders load ho rahe hain...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -8  }}
            transition={{ duration: 0.2 }}>

            {activeTab === "pending" && (
              <PendingTab
                orders={pendingOrders}
                onRefresh={handlePendingRefresh}
                showToast={showToast}
              />
            )}

            {activeTab === "dues" && (
              <DuesTab
                orders={pendingOrders}
                onRefresh={handleDuesRefresh}
                showToast={showToast}
              />
            )}

            {activeTab === "completed" && (
              <CompletedTab orders={completedOrders} />
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}