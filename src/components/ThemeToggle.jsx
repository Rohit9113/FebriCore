"use client";
// src/components/ThemeToggle.jsx
//
// ✅ NEW: Dark / Light theme toggle button
// Two variants:
//   <ThemeToggle />           → compact icon button (sidebar/header)
//   <ThemeToggle expanded />  → full labeled button

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ expanded = false }) {
  const { isDark, toggleTheme } = useTheme();

  if (expanded) {
    // Full labeled version — sidebar mein use karo
    return (
      <motion.button
        onClick={toggleTheme}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className="w-full flex items-center gap-3 px-0 py-2 rounded-2xl transition-all"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
          border:     isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
        }}
      >
        {/* Track */}
        <div className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all duration-300"
          style={{ background: isDark ? "#1e2235" : "#e2e8f0" }}>
          <motion.div
            animate={{ x: isDark ? 2 : 22 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
            style={{
              background: isDark ? "#4a5580" : "#f59e0b",
              boxShadow:  isDark ? "none" : "0 2px 8px rgba(245,158,11,0.4)",
            }}>
            {isDark ? "🌙" : "☀️"}
          </motion.div>
        </div>

        {/* Label */}
        <div className="flex-1 text-left">
          <AnimatePresence mode="wait">
            <motion.div key={isDark ? "dark" : "light"}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
              <p className="text-sm font-bold" style={{ color: isDark ? "#6b7a99" : "#475569" }}>
                {isDark ? "Dark" : "Light"}
              </p>
              {/* <p className="text-[10px]" style={{ color: isDark ? "#3d4260" : "#94a3b8" }}>
                {isDark ? "Switch to Light" : "Switch to Dark"}
              </p> */}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrow icon */}
        <motion.span animate={{ rotate: isDark ? 0 : 180 }} transition={{ duration: 0.3 }}
          className="text-lg flex-shrink-0" style={{ color: isDark ? "#3d4260" : "#94a3b8" }}>
          {isDark ? "🌙" : "☀️"}
        </motion.span>
      </motion.button>
    );
  }

  // Compact icon-only version — header mein use karo
  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.08 }}
      title={isDark ? "Light mode pe jaao" : "Dark mode pe jaao"}
      className="relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden"
      style={{
        background: isDark ? "#1e2235" : "#f1f5f9",
        border:     isDark ? "1px solid #2e3248" : "1px solid #e2e8f0",
        boxShadow:  isDark ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
      }}>

      {/* Animated background glow */}
      <motion.div
        animate={{
          background: isDark
            ? "radial-gradient(circle, #1e2235 0%, #1e2235 100%)"
            : "radial-gradient(circle, #fef3c7 0%, #f1f5f9 100%)",
        }}
        className="absolute inset-0 rounded-2xl" />

      {/* Icon swap */}
      <AnimatePresence mode="wait">
        <motion.span key={isDark ? "moon" : "sun"}
          initial={{ scale: 0, rotate: -90, opacity: 0 }}
          animate={{ scale: 1, rotate: 0,   opacity: 1 }}
          exit={{    scale: 0, rotate: 90,  opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="relative z-10 text-lg leading-none">
          {isDark ? "🌙" : "☀️"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}