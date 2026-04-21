"use client";
// src/components/RepairingSection.jsx
// ✅ Feature 14: Edit + Delete support added

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// ─── API ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Helpers ──────────────────────────────────────────────────────
const getToday    = () => new Date().toISOString().split("T")[0];
const fmtDate     = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[Number(m)-1]} ${y}`;
};
const fmtAmt      = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtAmtShort = (n) => {
  const v = Number(n || 0);
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v/1000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};

// ─── Input style ──────────────────────────────────────────────────
const inp = `w-full bg-[#06080f] border border-[#1e2235] rounded-xl px-4 py-3
             text-white text-sm placeholder-[#2e3248] outline-none transition-all
             focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/12`;

// ─── Toast hook ───────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  const ToastUI = () => (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0,  scale: 1   }}
            exit={{    opacity: 0, x: 60, scale: 0.9 }}
            className={`px-4 py-3 rounded-xl text-sm font-semibold shadow-xl border max-w-xs
              ${t.type === "error"
                ? "bg-red-500/20 border-red-500/40 text-red-300"
                : "bg-green-500/20 border-green-500/40 text-green-300"}`}>
            {t.type === "error" ? "❌ " : "✅ "}{t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return { show, ToastUI };
}

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, dim }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: dim, border: `1px solid ${color}25` }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${color}80` }}>{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: `${color}60` }}>{sub}</p>}
    </motion.div>
  );
}

// ─── Quick Add Form ───────────────────────────────────────────────
function QuickAddForm({ onSave, onCancel }) {
  const [amount,      setAmount]      = useState("");
  const [description, setDescription] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState("");

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) { setErr("Amount required hai"); return; }
    setSaving(true); setErr("");
    try {
      await onSave({ amount: Number(amount), description: description.trim() });
      setAmount(""); setDescription("");
    } catch (e) {
      setErr(e?.response?.data?.error || "Save nahi hua");
    } finally { setSaving(false); }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -12, scale: 0.98 }}
      className="bg-[#0d1120] border border-purple-500/30 rounded-2xl p-5 mb-5"
      style={{ boxShadow: "0 8px 40px rgba(168,85,247,0.08)" }}>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30
                        flex items-center justify-center text-lg">🔧</div>
        <div>
          <p className="text-white font-bold text-sm">Repairing Entry</p>
          <p className="text-[11px] text-purple-400/70">100% Profit · Aaj: {fmtDate(getToday())}</p>
        </div>
        <button onClick={onCancel}
          className="ml-auto w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10
                     flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
      </div>

      <div className="mb-3">
        <label className="block text-[10px] font-black uppercase tracking-widest text-purple-400/60 mb-2">
          💰 Amount (₹) *
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-black text-lg pointer-events-none">₹</span>
          <input type="text" inputMode="decimal"
            value={amount}
            onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setErr(""); }}
            onKeyDown={handleKey}
            placeholder="e.g. 500"
            autoFocus
            className={inp + " pl-9 text-lg font-bold"} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-black uppercase tracking-widest text-purple-400/60 mb-2">
          📝 Description (optional)
        </label>
        <input type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. Grill repair, welding work..."
          className={inp} />
      </div>

      {amount && Number(amount) > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400">Net Profit</p>
            <p className="text-xs text-gray-500">100% — koi material cost nahi</p>
          </div>
          <p className="text-green-400 font-black text-xl">{fmtAmt(amount)}</p>
        </motion.div>
      )}

      {err && <p className="text-red-400 text-xs mb-3">⚠️ {err}</p>}

      <div className="flex gap-3">
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || !amount || Number(amount) <= 0}
          className="flex-1 py-3 rounded-xl font-black text-sm text-white transition
                     disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                   boxShadow: saving ? "none" : "0 4px 20px rgba(168,85,247,0.3)" }}>
          {saving ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving...</>
          ) : "✅ Save Entry"}
        </motion.button>
        <button onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-white/10 text-gray-400
                     hover:bg-white/5 hover:text-white transition text-sm font-semibold">
          Cancel
        </button>
      </div>
      <p className="text-[10px] text-gray-600 text-center mt-3">Enter = save · Esc = cancel</p>
    </motion.div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────
function EditModal({ entry, onClose, onSuccess }) {
  const [amount,      setAmount]      = useState(String(entry.amount || ""));
  const [description, setDescription] = useState(entry.description || "");
  const [date,        setDate]        = useState(entry.date || getToday());
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState("");

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) { setErr("Amount valid hona chahiye"); return; }
    setSaving(true); setErr("");
    try {
      const { data } = await api.patch(`/repairing/${entry._id}`, {
        amount:      Number(amount),
        description: description.trim(),
        date,
      });
      if (data.success) { onSuccess(data.data); onClose(); }
      else setErr(data.error || "Update nahi hua");
    } catch (e) {
      setErr(e?.response?.data?.error || "Server error");
    } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div onClick={e => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-purple-500/25 rounded-2xl w-full max-w-sm
                     shadow-2xl shadow-purple-500/10 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25
                              flex items-center justify-center text-lg">✏️</div>
              <div>
                <p className="text-white font-bold text-sm">Entry Edit Karo</p>
                <p className="text-[11px] text-gray-500">Amount, description ya date badlo</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10
                         flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">

            {/* Amount */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-purple-400/60 mb-2">
                💰 Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-black text-lg pointer-events-none">₹</span>
                <input type="text" inputMode="decimal"
                  value={amount}
                  onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setErr(""); }}
                  autoFocus
                  className={inp + " pl-9 text-lg font-bold"} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                📝 Description
              </label>
              <input type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Kya kaam hua..."
                className={inp} />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                📅 Date
              </label>
              <input type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={inp} />
            </div>

            {/* Preview */}
            {amount && Number(amount) > 0 && Number(amount) !== entry.amount && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl px-4 py-3 flex justify-between items-center"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <div>
                  <p className="text-[10px] text-gray-500">Pehle</p>
                  <p className="text-gray-400 font-bold text-sm line-through">{fmtAmt(entry.amount)}</p>
                </div>
                <span className="text-gray-600 text-lg">→</span>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Naya</p>
                  <p className="text-purple-400 font-black text-base">{fmtAmt(amount)}</p>
                </div>
              </motion.div>
            )}

            {err && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">⚠️ {err}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl font-black text-sm text-white transition
                           disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                         boxShadow: "0 4px 20px rgba(168,85,247,0.25)" }}>
                {saving ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Saving...</>
                ) : "✅ Update Karo"}
              </motion.button>
              <button onClick={onClose}
                className="px-4 py-3 rounded-xl border border-white/10 text-gray-400
                           hover:bg-white/5 hover:text-white transition text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────
function DeleteModal({ entry, onClose, onSuccess }) {
  const [deleting, setDeleting] = useState(false);
  const [err,      setErr]      = useState("");

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true); setErr("");
    try {
      const { data } = await api.delete(`/repairing/${entry._id}`);
      if (data.success) { onSuccess(entry._id); onClose(); }
      else setErr(data.error || "Delete nahi hua");
    } catch (e) {
      setErr(e?.response?.data?.error || "Server error");
    } finally { setDeleting(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1,   y: 0  }}
        exit={{    opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div onClick={e => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-red-500/30 rounded-2xl w-full max-w-sm
                     shadow-2xl shadow-red-500/10 p-6">

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25
                         flex items-center justify-center text-3xl">
              🗑️
            </motion.div>
          </div>

          <h3 className="text-white font-bold text-xl text-center mb-1">Delete Karna Chahte Ho?</h3>
          <p className="text-gray-400 text-sm text-center mb-5">Yeh entry permanently delete ho jaayegi</p>

          {/* Entry detail */}
          <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl px-4 py-3.5 mb-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Amount</span>
              <span className="text-purple-400 font-black text-lg">{fmtAmt(entry.amount)}</span>
            </div>
            {entry.description && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Description</span>
                <span className="text-gray-300 text-sm">{entry.description}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Date</span>
              <span className="text-gray-300 text-sm">{fmtDate(entry.date)}</span>
            </div>
          </div>

          {err && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">⚠️ {err}</p>
            </div>
          )}

          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={handleDelete} disabled={deleting}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white transition
                         disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)",
                       boxShadow: "0 4px 20px rgba(239,68,68,0.25)" }}>
              {deleting ? (
                <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Deleting...</>
              ) : "🗑️ Haan, Delete Karo"}
            </motion.button>
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400
                         hover:bg-white/5 hover:text-white transition text-sm font-bold">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Entry Row — with Edit + Delete ──────────────────────────────
function EntryRow({ entry, index, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 28 }}
      className="flex items-center justify-between px-4 py-3.5 group transition-colors hover:bg-white/[0.02]"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>

      {/* Left — icon + text */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20
                        flex items-center justify-center text-sm flex-shrink-0">
          🔧
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {entry.description || "Repairing Work"}
          </p>
          <p className="text-gray-500 text-xs">{fmtDate(entry.date)}</p>
        </div>
      </div>

      {/* Right — amount + action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">

        {/* Edit / Delete — hover pe dikhte hain desktop pe, mobile pe hamesha */}
        <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => onEdit(entry)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition"
            style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7" }}
            title="Edit">
            ✏️
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }}
            onClick={() => onDelete(entry)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
            title="Delete">
            🗑️
          </motion.button>
        </div>

        <p className="text-green-400 font-black text-base">{fmtAmt(entry.amount)}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function RepairingSection() {
  const [entries,     setEntries]     = useState([]);
  const [summary,     setSummary]     = useState({ totalAmount: 0, totalEntries: 0 });
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [filter,      setFilter]      = useState("all");
  const [editEntry,   setEditEntry]   = useState(null); // ✅ NEW
  const [deleteEntry, setDeleteEntry] = useState(null); // ✅ NEW

  const { show: toast, ToastUI } = useToast();

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/repairing");
      if (data.success) {
        setEntries(data.data || []);
        setSummary(data.summary || { totalAmount: 0, totalEntries: 0 });
      }
    } catch (e) {
      toast(e?.response?.data?.error || "Data load nahi hua", "error");
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Add ────────────────────────────────────────────────────────
  const handleSave = async ({ amount, description }) => {
    const { data } = await api.post("/repairing", { amount, description });
    if (data.success) {
      setEntries(prev => [data.data, ...prev]);
      setSummary(prev => ({
        totalAmount:  prev.totalAmount + amount,
        totalEntries: prev.totalEntries + 1,
      }));
      setShowForm(false);
      toast(`${fmtAmt(amount)} repairing entry add ho gaya! 🎉`);
    }
  };

  // ✅ NEW — Edit success: list mein update karo
  const handleEditSuccess = (updatedEntry) => {
    setEntries(prev =>
      prev.map(e => e._id === updatedEntry._id ? updatedEntry : e)
    );
    // Summary recalculate
    setSummary(prev => {
      const oldAmt = entries.find(e => e._id === updatedEntry._id)?.amount || 0;
      return {
        ...prev,
        totalAmount: prev.totalAmount - oldAmt + updatedEntry.amount,
      };
    });
    toast("Entry update ho gaya ✅");
  };

  // ✅ NEW — Delete success: list se hata do
  const handleDeleteSuccess = (deletedId) => {
    const deleted = entries.find(e => e._id === deletedId);
    setEntries(prev => prev.filter(e => e._id !== deletedId));
    setSummary(prev => ({
      totalAmount:  prev.totalAmount - (deleted?.amount || 0),
      totalEntries: prev.totalEntries - 1,
    }));
    toast("Entry delete ho gayi 🗑️");
  };

  // ── Filter ─────────────────────────────────────────────────────
  const today     = getToday();
  const thisMonth = today.substring(0, 7);

  const filtered = entries.filter(e => {
    if (filter === "today")     return e.date === today;
    if (filter === "thisMonth") return e.date?.startsWith(thisMonth);
    return true;
  });

  const todayTotal     = entries.filter(e => e.date === today)
                                .reduce((s, e) => s + e.amount, 0);
  const thisMonthTotal = entries.filter(e => e.date?.startsWith(thisMonth))
                                .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="text-white">
      <ToastUI />

      {/* ── Edit Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {editEntry && (
          <EditModal
            entry={editEntry}
            onClose={() => setEditEntry(null)}
            onSuccess={handleEditSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteEntry && (
          <DeleteModal
            entry={deleteEntry}
            onClose={() => setDeleteEntry(null)}
            onSuccess={handleDeleteSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            🔧 Repairing <span className="text-purple-400">Income</span>
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Sirf amount aur description — 100% profit guaranteed
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!showForm && (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-2xl
                         font-black text-sm text-white overflow-hidden"
              style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                       boxShadow: "0 4px 20px rgba(168,85,247,0.35)" }}>
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
              <span className="relative z-10">🔧</span>
              <span className="relative z-10">+ Add Repairing</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Quick Add Form ───────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <QuickAddForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* ── Stat Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Aaj"       value={fmtAmtShort(todayTotal)}        sub={`${entries.filter(e => e.date === today).length} entries`}              icon="📅" color="#a855f7" dim="#a855f710" />
        <StatCard label="Is Mahine" value={fmtAmtShort(thisMonthTotal)}    sub={`${entries.filter(e => e.date?.startsWith(thisMonth)).length} entries`}  icon="📆" color="#10b981" dim="#10b98110" />
        <StatCard label="Kul Total" value={fmtAmtShort(summary.totalAmount)} sub={`${summary.totalEntries} entries`}                                     icon="💰" color="#f59e0b" dim="#f59e0b10" />
      </div>

      {/* ── 100% Profit Banner ───────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 bg-green-500/8 border border-green-500/20
                   rounded-2xl px-4 py-3 mb-5">
        <span className="text-2xl">🎯</span>
        <div className="flex-1">
          <p className="text-green-400 font-bold text-sm">100% Net Profit</p>
          <p className="text-gray-500 text-xs">
            Repairing mein material cost nahi hoti — poora amount profit mein jaata hai.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-500">Total Profit</p>
          <p className="text-green-400 font-black text-lg">{fmtAmtShort(summary.totalAmount)}</p>
        </div>
      </motion.div>

      {/* ── Filter Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "all",       label: "Sab"       },
          { id: "thisMonth", label: "Is Mahine" },
          { id: "today",     label: "Aaj"       },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all
              ${filter === f.id
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            {f.label}
          </button>
        ))}
        <motion.button whileTap={{ scale: 0.88, rotate: 180 }}
          onClick={fetchAll} transition={{ duration: 0.35 }}
          className="ml-auto w-8 h-8 flex items-center justify-center rounded-xl
                     bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition text-sm">
          🔄
        </motion.button>
      </div>

      {/* ── Entries List ─────────────────────────────────────────── */}
      <div className="bg-[#0c0e1a] border border-[#1e2235] rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3
                        border-b border-white/5 bg-[#08090f]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
            Repairing Entries ({filtered.length})
          </p>
          {filtered.length > 0 && (
            <p className="text-purple-400 font-black text-sm">
              {fmtAmt(filtered.reduce((s, e) => s + e.amount, 0))}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <motion.div animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full" />
            <p className="text-gray-500 text-sm">Load ho raha hai...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-3">🔧</p>
            <p className="text-white font-bold">Koi repairing entry nahi mili</p>
            <p className="text-gray-500 text-sm mt-1">
              {filter !== "all" ? "Is period mein koi entry nahi hai" : `Upar "+ Add Repairing" se shuru karo`}
            </p>
          </motion.div>
        )}

        {/* Entries */}
        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-white/[0.03]">
            <AnimatePresence>
              {filtered.map((entry, i) => (
                <EntryRow
                  key={entry._id || i}
                  entry={entry}
                  index={i}
                  onEdit={setEditEntry}
                  onDelete={setDeleteEntry}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center text-[11px] text-gray-600 mt-4">
          💡 Yeh data automatically Income aur Profit dashboard mein reflect hota hai
        </motion.p>
      )}
    </div>
  );
}