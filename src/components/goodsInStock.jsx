"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";

// ─── API (no more localhost!) ────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Constants ───────────────────────────────────────────────────
const METAL_TYPES  = ["MS", "GI", "Other"];
const TODAY        = new Date().toISOString().split("T")[0];
const inp          = "w-full bg-[#06080f] border border-[#1e2235] rounded-2xl px-4 py-3 text-white text-sm placeholder-[#2e3248] focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/12 transition-all duration-200";
const fmtKg        = (n) => `${Number(n || 0).toLocaleString("en-IN")} kg`;
const fmtAmt       = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const METAL_META = {
  MS:    { color: "#3b82f6", dim: "#3b82f618", label: "Mild Steel"    },
  GI:    { color: "#10b981", dim: "#10b98118", label: "Galv. Iron"    },
  Other: { color: "#8b5cf6", dim: "#8b5cf618", label: "Other Metals"  },
};

// ════════════════════════════════════════════════════════════════
// 🔔 TOAST
// ════════════════════════════════════════════════════════════════
function Toast({ toasts }) {
  return (
    <div className="fixed top-20 right-4 z-[300] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold shadow-2xl pointer-events-auto max-w-xs"
            style={{
              background:   t.type === "error" ? "#1a050518" : t.type === "success" ? "#05180b18" : "#0a0e2018",
              backdropFilter: "blur(20px)",
              border:       t.type === "error" ? "1px solid #ef444430" : t.type === "success" ? "1px solid #10b98130" : "1px solid #3b82f630",
              color:        t.type === "error" ? "#ef4444"   : t.type === "success" ? "#10b981"   : "#3b82f6",
            }}>
            <span className="text-lg flex-shrink-0">
              {t.type === "error" ? "⚠️" : t.type === "success" ? "✅" : "ℹ️"}
            </span>
            <span className="leading-snug">{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 📦 SUMMARY STAT CARD — 3D tilt + animated number
// ════════════════════════════════════════════════════════════════
function StatCard({ label, value, unit, color, dim, icon, delay = 0 }) {
  const ref  = useRef(null);
  const rotX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotY = useSpring(0, { stiffness: 300, damping: 30 });
  const gX   = useSpring(50, { stiffness: 200, damping: 25 });
  const gY   = useSpring(50, { stiffness: 200, damping: 25 });
  const bg   = useTransform([gX, gY], ([x, y]) =>
    `radial-gradient(circle at ${x}% ${y}%, ${color}20 0%, transparent 65%)`
  );

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top)  / r.height;
    rotX.set((py - 0.5) * -14);
    rotY.set((px - 0.5) *  14);
    gX.set(px * 100);
    gY.set(py * 100);
  };
  const onLeave = () => { rotX.set(0); rotY.set(0); gX.set(50); gY.set(50); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 280, damping: 26 }}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 900 }}
      className="relative rounded-2xl overflow-hidden"
    >
      <motion.div style={{ background: bg }} className="absolute inset-0 rounded-2xl pointer-events-none z-10" />
      <div className="relative p-4 sm:p-5 rounded-2xl"
        style={{ background: dim, border: `1px solid ${color}25` }}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em]"
            style={{ color: `${color}90` }}>{label}</p>
          <motion.span
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
            className="text-xl leading-none flex-shrink-0"
          >{icon}</motion.span>
        </div>
        <p className="font-black text-xl sm:text-2xl leading-tight" style={{ color, fontFamily: "'Syne', sans-serif" }}>
          {value}
        </p>
        {unit && <p className="text-[10px] mt-1" style={{ color: `${color}70` }}>{unit}</p>}
        {/* Bottom bar */}
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: delay + 0.3, duration: 0.8, ease: [0.22,1,0.36,1] }}
          style={{ originX: 0, background: `linear-gradient(90deg, ${color}, ${color}44)` }}
          className="mt-3 h-0.5 rounded-full" />
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
// 🏷️ METAL TYPE BADGE
// ════════════════════════════════════════════════════════════════
function MetalBadge({ type }) {
  const m = METAL_META[type] || METAL_META.Other;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-lg font-black flex-shrink-0"
      style={{ background: m.dim, color: m.color, border: `1px solid ${m.color}30` }}>
      {type}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
// 📋 DATE ROW — expandable on mobile, table row on desktop
// ════════════════════════════════════════════════════════════════
function DateRow({ d, index, onView }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 28 }}
    >
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_100px_80px] gap-2 items-center px-4 py-3.5 rounded-2xl transition-colors hover:bg-white/[0.02] group"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400/60 flex-shrink-0" />
          <span className="text-white font-semibold text-sm">{d.date}</span>
        </div>
        <span className="text-center text-sm font-bold" style={{ color: METAL_META.MS.color }}>
          {d.ms > 0 ? `${d.ms}kg` : "—"}
        </span>
        <span className="text-center text-sm font-bold" style={{ color: METAL_META.GI.color }}>
          {d.gi > 0 ? `${d.gi}kg` : "—"}
        </span>
        <span className="text-center text-sm font-bold" style={{ color: METAL_META.Other.color }}>
          {d.other > 0 ? `${d.other}kg` : "—"}
        </span>
        <span className="text-center text-amber-400 font-bold text-sm">
          {fmtAmt(d.totalValue)}
        </span>
        <div className="flex justify-center">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => onView(d.date)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
            style={{ background: "#3b82f618", border: "1px solid #3b82f630", color: "#3b82f6" }}>
            👁 View
          </motion.button>
        </div>
      </div>

      {/* Mobile card */}
      <div className="md:hidden rounded-2xl p-4 mb-2"
        style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400/60" />
            <span className="text-white font-bold text-sm">{d.date}</span>
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => onView(d.date)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: "#3b82f618", border: "1px solid #3b82f630", color: "#3b82f6" }}>
            👁 View
          </motion.button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {d.ms > 0 && (
            <div className="rounded-xl px-3 py-2" style={{ background: "#3b82f60d" }}>
              <p className="text-[9px] text-[#3d4260] uppercase font-black mb-0.5">MS</p>
              <p className="text-sm font-black" style={{ color: METAL_META.MS.color }}>{d.ms} kg</p>
            </div>
          )}
          {d.gi > 0 && (
            <div className="rounded-xl px-3 py-2" style={{ background: "#10b9810d" }}>
              <p className="text-[9px] text-[#3d4260] uppercase font-black mb-0.5">GI</p>
              <p className="text-sm font-black" style={{ color: METAL_META.GI.color }}>{d.gi} kg</p>
            </div>
          )}
          {d.other > 0 && (
            <div className="rounded-xl px-3 py-2" style={{ background: "#8b5cf60d" }}>
              <p className="text-[9px] text-[#3d4260] uppercase font-black mb-0.5">Other</p>
              <p className="text-sm font-black" style={{ color: METAL_META.Other.color }}>{d.other} kg</p>
            </div>
          )}
          <div className="rounded-xl px-3 py-2" style={{ background: "#f59e0b0d" }}>
            <p className="text-[9px] text-[#3d4260] uppercase font-black mb-0.5">Value</p>
            <p className="text-sm font-black text-amber-400">{fmtAmt(d.totalValue)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
// 📄 ADD GOODS MODAL
// ════════════════════════════════════════════════════════════════
function AddGoodsModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    date: TODAY, metalType: "", metalSize: "", perKgRate: "", totalKg: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    const { date, metalType, metalSize, perKgRate, totalKg } = form;
    if (!date || !metalType || !metalSize || !perKgRate || !totalKg) {
      setErr("Sab fields bharo!"); return;
    }
    setLoading(true); setErr("");
    try {
      const res = await api.post("/goods", {
        materialType: metalType,
        size: metalSize,
        perKgRate: Number(perKgRate),
        totalKg: Number(totalKg),
        date,
      });
      if (res.data.success) { onSuccess(); onClose(); }
      else setErr(res.data.error || "Error hua");
    } catch (e) {
      setErr(e?.response?.data?.error || "Server error");
    } finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "#0d0f1e", border: "1px solid #1e2235", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1e2235" }}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/60">PURCHASE</p>
            <h3 className="text-white font-black text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
              Naya Goods Add Karo
            </h3>
          </div>
          <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#4a5580] hover:text-white transition-colors"
            style={{ background: "#1e2235" }}>✕</motion.button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {err && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl px-4 py-3 text-red-400 text-sm font-bold"
              style={{ background: "#ef444412", border: "1px solid #ef444428" }}>
              ⚠️ {err}
            </motion.div>
          )}

          {/* Date */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#3d4260] mb-2">📅 Date</p>
            <input type="date" value={form.date} onChange={e => sf("date", e.target.value)} className={inp} />
          </div>

          {/* Metal Type — pill selector */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#3d4260] mb-2.5">⚙️ Metal Type</p>
            <div className="flex gap-2">
              {METAL_TYPES.map(t => {
                const m = METAL_META[t];
                const sel = form.metalType === t;
                return (
                  <motion.button key={t} type="button" whileTap={{ scale: 0.88, y: 2 }}
                    onClick={() => sf("metalType", t)}
                    className="flex-1 py-3 rounded-2xl text-sm font-black transition-all"
                    style={{
                      background:   sel ? m.dim          : "#06080f",
                      border:       `1px solid ${sel ? m.color + "50" : "#1e2235"}`,
                      color:        sel ? m.color        : "#3d4260",
                      boxShadow:    sel ? `0 4px 20px ${m.color}18` : "none",
                    }}>
                    {t}
                    {sel && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-1.5 h-1.5 rounded-full mx-auto mt-1"
                        style={{ background: m.color }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Size */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#3d4260] mb-2">📐 Size</p>
            <input value={form.metalSize} onChange={e => sf("metalSize", e.target.value)}
              placeholder="e.g. 25×5, 40×5..." className={inp} />
          </div>

          {/* Rate + Kg */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#3d4260] mb-2">💲 Rate/kg</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-black text-base pointer-events-none">₹</span>
                <input type="number" inputMode="decimal" value={form.perKgRate}
                  onChange={e => sf("perKgRate", e.target.value)}
                  placeholder="58" className={inp + " pl-8"} />
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#3d4260] mb-2">⚖️ Total Kg</p>
              <input type="number" inputMode="decimal" value={form.totalKg}
                onChange={e => sf("totalKg", e.target.value)}
                placeholder="500" className={inp} />
            </div>
          </div>

          {/* Live preview */}
          {form.perKgRate && form.totalKg && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl px-4 py-3 flex justify-between items-center"
              style={{ background: "#f59e0b0a", border: "1px solid #f59e0b20" }}>
              <p className="text-[#4a5580] text-xs font-medium">Estimated Total</p>
              <p className="text-amber-400 font-black text-lg">
                {fmtAmt(Number(form.perKgRate) * Number(form.totalKg))}
              </p>
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={loading}
            className="relative w-full h-14 rounded-2xl font-black text-base overflow-hidden disabled:opacity-50 text-black"
            style={{ background: "#3b82f6", boxShadow: "0 6px 30px #3b82f625" }}
          >
            {!loading && (
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 0.8 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-black/25 border-t-black rounded-full inline-block" />
                  Saving...</>
              ) : "📦 Goods Save Karo"}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
// 🔍 VIEW DETAILS MODAL
// ════════════════════════════════════════════════════════════════
function ViewModal({ date, items, onClose }) {
  const totalKg  = items.reduce((a, g) => a + Number(g.totalKg), 0);
  const totalAmt = items.reduce((a, g) => a + Number(g.amount), 0);

  const handlePDF = async () => {
    try {
      const jsPDF    = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const doc      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Header
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("Guru Welding Workshop", 14, 20);
      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      doc.text("Near Jaltanda Bazzar, Ranchi", 14, 27);
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(`Purchase Date: ${date}`, 14, 36);

      autoTable(doc, {
        startY: 44,
        head: [["#", "Metal", "Size", "Rate/kg", "Total Kg", "Amount"]],
        body: items.map((g, i) => [
          i + 1, g.metalType, g.metalSize,
          `Rs.${Number(g.perKgRate).toLocaleString("en-IN")}`,
          `${g.totalKg} kg`,
          `Rs.${Number(g.amount).toLocaleString("en-IN")}`,
        ]),
        theme: "grid",
        styles: { fontSize: 10, halign: "center", cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      const fy = doc.lastAutoTable.finalY || 80;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(`Total Weight: ${totalKg} kg`, 14, fy + 10);
      doc.text(`Total Amount: Rs.${totalAmt.toLocaleString("en-IN")}`, 130, fy + 10);
      doc.save(`Purchase_${date}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "#0d0f1e", border: "1px solid #1e2235", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1e2235" }}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/60">PURCHASE DETAIL</p>
            <h3 className="text-white font-black text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>{date}</h3>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handlePDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: "#3b82f618", border: "1px solid #3b82f630", color: "#3b82f6" }}>
              📄 PDF
            </motion.button>
            <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#4a5580] hover:text-white"
              style={{ background: "#1e2235" }}>✕</motion.button>
          </div>
        </div>

        {/* Items */}
        <div className="p-5 space-y-3">
          {items.map((g, i) => {
            const m = METAL_META[g.metalType] || METAL_META.Other;
            return (
              <motion.div key={g.id || i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4"
                style={{ background: m.dim, border: `1px solid ${m.color}20` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MetalBadge type={g.metalType} />
                    <span className="text-white font-bold text-sm">{g.metalSize}</span>
                  </div>
                  <span className="text-amber-400 font-black">{fmtAmt(g.amount)}</span>
                </div>
                <div className="flex gap-4 text-xs text-[#4a5580]">
                  <span>⚖️ {g.totalKg} kg</span>
                  <span>💲 {fmtAmt(g.perKgRate)}/kg</span>
                </div>
              </motion.div>
            );
          })}

          {/* Total */}
          <div className="rounded-2xl px-4 py-3.5 flex justify-between items-center mt-2"
            style={{ background: "#f59e0b0a", border: "1px solid #f59e0b25" }}>
            <div>
              <p className="text-[9px] text-[#3d4260] uppercase font-black">Total Weight</p>
              <p className="text-white font-black">{fmtKg(totalKg)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#3d4260] uppercase font-black">Total Amount</p>
              <p className="text-amber-400 font-black text-xl">{fmtAmt(totalAmt)}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
// ✨ MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function GoodsInStock() {
  const [goods,       setGoods]       = useState([]);
  const [summary,     setSummary]     = useState({ totalMS:0, totalGI:0, totalOthers:0, totalStock:0 });
  const [loading,     setLoading]     = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [viewDate,    setViewDate]    = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts,      setToasts]      = useState([]);
  const [search,      setSearch]      = useState("");
  const ITEMS_PER_PAGE = 8;

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gr, sr] = await Promise.all([
        api.get("/goods"),
        api.get("/goods/summary"),
      ]);
      if (gr.data.success) setGoods(gr.data.data);
      if (sr.data.success) setSummary(sr.data.data);
    } catch (e) {
      addToast(e?.response?.data?.error || "Data load nahi hua", "error");
    } finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group by date
  const grouped = goods.reduce((acc, g) => {
    const date = new Date(g.date).toLocaleDateString("en-GB");
    if (!acc[date]) acc[date] = [];
    acc[date].push({
      id: g._id, metalType: g.materialType, metalSize: g.size,
      perKgRate: g.perKgRate, totalKg: g.totalKg, amount: g.totalAmount,
    });
    return acc;
  }, {});

  const dateSummaries = Object.keys(grouped)
    .sort((a, b) => {
      const pd = s => { const [d,m,y] = s.split("/").map(Number); return new Date(y,m-1,d); };
      return pd(b) - pd(a);
    })
    .map(date => {
      const items = grouped[date];
      return items.reduce(
        (acc, g) => {
          const t = g.metalType?.toUpperCase();
          if (t === "MS") acc.ms += Number(g.totalKg);
          else if (t === "GI") acc.gi += Number(g.totalKg);
          else acc.other += Number(g.totalKg);
          acc.totalKg    += Number(g.totalKg);
          acc.totalValue += Number(g.amount);
          return acc;
        },
        { date, ms:0, gi:0, other:0, totalKg:0, totalValue:0 }
      );
    });

  // Search filter
  const filtered = dateSummaries.filter(d =>
    d.date.includes(search) ||
    (search === "ms" && d.ms > 0) ||
    (search === "gi" && d.gi > 0)
  );

  const totalPages   = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentDates = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleAddSuccess = () => {
    addToast("Goods successfully add ho gaya!", "success");
    fetchAll();
  };

  return (
    <div className="px-4 sm:px-5 lg:px-6 pb-6 pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Toast toasts={toasts} />

      {/* ── STAT CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Stock"  value={fmtKg(summary.totalStock)}  icon="📦" color="#3b82f6" dim="#3b82f612" delay={0}    />
        <StatCard label="MS Stock"     value={fmtKg(summary.totalMS)}     icon="🔩" color={METAL_META.MS.color}    dim={METAL_META.MS.dim}    delay={0.06} />
        <StatCard label="GI Stock"     value={fmtKg(summary.totalGI)}     icon="⚙️" color={METAL_META.GI.color}    dim={METAL_META.GI.dim}    delay={0.12} />
        <StatCard label="Other Metals" value={fmtKg(summary.totalOthers)} icon="🪙" color={METAL_META.Other.color} dim={METAL_META.Other.dim} delay={0.18} />
      </div>

      {/* ── STOCK BREAKDOWN BAR ──────────────────────────────────── */}
      {summary.totalStock > 0 && (
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
          className="rounded-2xl p-4 mb-5"
          style={{ background: "#0c0e1a", border: "1px solid #1e2235" }}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3d4260] mb-3">Stock Distribution</p>
          <div className="flex rounded-xl overflow-hidden h-3 gap-0.5">
            {[
              { val: summary.totalMS,     color: METAL_META.MS.color    },
              { val: summary.totalGI,     color: METAL_META.GI.color    },
              { val: summary.totalOthers, color: METAL_META.Other.color },
            ].map((s, i) => {
              const pct = summary.totalStock > 0 ? (s.val / summary.totalStock) * 100 : 0;
              if (pct === 0) return null;
              return (
                <motion.div key={i}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease: [0.22,1,0.36,1] }}
                  style={{ background: s.color }}
                  className="rounded-lg"
                />
              );
            })}
          </div>
          <div className="flex gap-4 mt-2.5">
            {[
              { label:"MS",    val:summary.totalMS,     color:METAL_META.MS.color    },
              { label:"GI",    val:summary.totalGI,     color:METAL_META.GI.color    },
              { label:"Other", val:summary.totalOthers, color:METAL_META.Other.color },
            ].filter(x => x.val > 0).map(x => (
              <div key={x.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: x.color }} />
                <span className="text-[10px] text-[#4a5580]">{x.label}: {fmtKg(x.val)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── TOOLBAR ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3d4260] text-sm pointer-events-none">🔍</span>
          <input
            value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Date ya metal type search karo..."
            className={inp + " pl-9"}
          />
        </div>

        {/* Refresh */}
        <motion.button whileTap={{ scale:0.88, rotate:180 }} onClick={fetchAll}
          transition={{ duration: 0.35 }}
          className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0"
          style={{ background:"#0c0e1a", border:"1px solid #1e2235", color:"#4a5580" }}>
          🔄
        </motion.button>

        {/* Add button */}
        <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowAdd(true)}
          className="relative flex items-center justify-center gap-2 px-5 h-11 rounded-2xl font-black text-sm overflow-hidden text-black flex-shrink-0"
          style={{ background:"#3b82f6", boxShadow:"0 4px 20px #3b82f630" }}>
          <motion.div animate={{ x:["-100%","200%"] }}
            transition={{ duration:2, repeat:Infinity, ease:"linear", repeatDelay:1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12" />
          <span className="relative z-10">＋</span>
          <span className="relative z-10 hidden sm:inline">Goods Add Karo</span>
        </motion.button>
      </div>

      {/* ── LOADING ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <motion.div animate={{ rotate:360 }} transition={{ duration:0.9, repeat:Infinity, ease:"linear" }}
            className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full" />
          <p className="text-[#4a5580] text-sm">Load ho raha hai...</p>
        </div>
      )}

      {/* ── DATES LIST ──────────────────────────────────────────── */}
      {!loading && (
        <>
          {currentDates.length === 0 ? (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-5xl mb-4">📦</p>
              <p className="text-white font-black text-lg">Koi goods nahi mila</p>
              <p className="text-[#3d4260] text-sm mt-1">Upar "+ Goods Add Karo" button se shuru karo</p>
            </motion.div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background:"#0c0e1a", border:"1px solid #1e2235" }}>
              {/* Desktop table header */}
              <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_100px_80px] gap-2 px-4 py-3"
                style={{ borderBottom:"1px solid #1e2235", background:"#08090f" }}>
                {["Date","MS","GI","Other","Value",""].map(h => (
                  <p key={h} className="text-[9px] font-black uppercase tracking-[0.18em] text-[#2e3248] text-center first:text-left">{h}</p>
                ))}
              </div>

              {/* Rows */}
              <div className="p-3 md:p-2 md:px-3 space-y-0">
                <AnimatePresence>
                  {currentDates.map((d, i) => (
                    <DateRow key={d.date} d={d} index={i} onView={setViewDate} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── PAGINATION ────────────────────────────────────────── */}
          {totalPages > 1 && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
              className="flex items-center justify-center gap-2 mt-4">
              <motion.button whileTap={{ scale:0.9 }}
                onClick={() => setCurrentPage(p => Math.max(p-1,1))}
                disabled={currentPage===1}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                style={{ background:"#0c0e1a", border:"1px solid #1e2235", color:"#6b7a99" }}>
                ← Prev
              </motion.button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
                  <motion.button key={p} whileTap={{ scale:0.88 }}
                    onClick={() => setCurrentPage(p)}
                    className="w-9 h-9 rounded-xl text-sm font-black transition-all"
                    style={{
                      background:  currentPage===p ? "#3b82f6"   : "#0c0e1a",
                      border:      `1px solid ${currentPage===p ? "#3b82f6" : "#1e2235"}`,
                      color:       currentPage===p ? "#fff"       : "#4a5580",
                      boxShadow:   currentPage===p ? "0 4px 12px #3b82f630" : "none",
                    }}>
                    {p}
                  </motion.button>
                ))}
              </div>

              <motion.button whileTap={{ scale:0.9 }}
                onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))}
                disabled={currentPage===totalPages}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                style={{ background:"#0c0e1a", border:"1px solid #1e2235", color:"#6b7a99" }}>
                Next →
              </motion.button>
            </motion.div>
          )}
        </>
      )}

      {/* ── MODALS ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <AddGoodsModal onClose={() => setShowAdd(false)} onSuccess={handleAddSuccess} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewDate && grouped[viewDate] && (
          <ViewModal date={viewDate} items={grouped[viewDate]} onClose={() => setViewDate(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}