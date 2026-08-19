"use client";
// src/components/RentManager.jsx
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import adminApi from "@/lib/adminApi";

// ── API instance ──────────────────────────────────────────────────
// adminApi already token attach karta hai aur agar access token expire ho
// jaaye (15 min) to refreshToken se silently naya token le kar request
// dobara try karta hai — isliye "Access token expire ho gaya" wala error
// ab user ko dikhega hi nahi jab tak refresh token bhi expire na ho jaaye.
const api = adminApi;

const TODAY = new Date().toISOString().split("T")[0];
const CURRENT_MONTH = TODAY.slice(0, 7);

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtMonth = (m) => {
  if (!m) return "—";
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

// "months" array latest-first hota hai (rentUtils se). Payment jab bina
// specific month select kiye "Pay Karo" dabaya jaaye, to sabse PURANA
// pending month uthana chahiye — backlog pehle clear ho, latest month nahi.
const oldestUnpaidMonth = (months) => {
  const unpaid = months.filter((m) => m.due > 0);
  if (unpaid.length === 0) return null;
  return [...unpaid].sort((a, b) => a.month.localeCompare(b.month))[0].month;
};

const STATUS_CONFIG = {
  pending:    { label: "Pending",  emoji: "⏳", bg: "bg-white/5",       text: "text-gray-400",   border: "border-white/10"       },
  overdue:    { label: "Overdue",  emoji: "🚨", bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30"     },
  partial:    { label: "Partial",  emoji: "◐",  bg: "bg-orange-500/15",text: "text-orange-400", border: "border-orange-500/30"  },
  "on-time":  { label: "On Time",  emoji: "✅", bg: "bg-green-500/15",  text: "text-green-400",  border: "border-green-500/30"   },
  late:       { label: "Late",     emoji: "⚠️", bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30"     },
  advance:    { label: "Advance",  emoji: "⏩", bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30"    },
};

// ── Toast ─────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
            className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg border max-w-xs
              ${t.type === "error"   ? "bg-red-500/20 border-red-500/40 text-red-300"
              : t.type === "warning" ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : "bg-green-500/20 border-green-500/40 text-green-300"}`}>
            {t.type === "error" ? "❌ " : t.type === "warning" ? "⚠️ " : "✅ "}{t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return { show, ToastContainer };
}

// ── Settings Modal ───────────────────────────────────────────────
function SettingsModal({ settings, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    landlordName:    settings?.landlordName    || "",
    landlordPhone:   settings?.landlordPhone   || "",
    propertyAddress: settings?.propertyAddress || "",
    dueDay:          String(settings?.dueDay   || 5),
    rentStartMonth:  settings?.rentStartMonth || CURRENT_MONTH,
    monthlyRent:     String(settings?.monthlyRent || ""),
    effectiveDate:   TODAY,
    reason:          "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const rentChanged = Number(form.monthlyRent) > 0 && Number(form.monthlyRent) !== settings?.monthlyRent;
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setError("");
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) {
      setError("Monthly rent required hai"); return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch("/rent", {
        landlordName:    form.landlordName,
        landlordPhone:   form.landlordPhone,
        propertyAddress: form.propertyAddress,
        dueDay:          Number(form.dueDay),
        rentStartMonth:  form.rentStartMonth,
        monthlyRent:     Number(form.monthlyRent),
        effectiveDate:   form.effectiveDate,
        reason:          form.reason,
      });
      toast("Rent settings save ho gaye ✅");
      onSaved(data.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

          <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-lg">🏠</div>
              <div>
                <p className="text-white font-bold text-sm">Rent Settings</p>
                <p className="text-[11px] text-gray-500">Landlord aur rent details</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Landlord Name</label>
                <input value={form.landlordName} onChange={(e) => setField("landlordName", e.target.value)}
                  placeholder="e.g. Suresh Sahu"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Landlord Phone</label>
                <input value={form.landlordPhone} onChange={(e) => setField("landlordPhone", e.target.value)}
                  placeholder="98XXXXXXXX" type="tel"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Property Address</label>
              <textarea value={form.propertyAddress} onChange={(e) => setField("propertyAddress", e.target.value)}
                placeholder="Shop / property ka pata" rows={2}
                className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition resize-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Monthly Rent (₹) *</label>
                <input value={form.monthlyRent} onChange={(e) => setField("monthlyRent", e.target.value)}
                  placeholder="e.g. 5000" type="number" min="0"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Due Day (tareekh)</label>
                <input value={form.dueDay} onChange={(e) => setField("dueDay", e.target.value)}
                  placeholder="5" type="number" min="1" max="28"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
                <p className="text-[10px] text-gray-600 mt-1">
                  Ek mahine ka rent agle mahine ki is tareekh tak due hota hai — e.g. August ka rent, 12 September tak
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Rent Kis Mahine Se Shuru Hui</label>
              <input value={form.rentStartMonth} onChange={(e) => setField("rentStartMonth", e.target.value)}
                type="month"
                className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white outline-none text-sm transition" />
              <p className="text-[10px] text-gray-600 mt-1">
                Isse pehle wale mahine "Overdue" mein nahi dikhenge — e.g. shop Sept mein li, rent Oct se to yahan October select karo
              </p>
            </div>

            {rentChanged && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-purple-500/8 border border-purple-500/20 rounded-xl p-4 space-y-3">
                <p className="text-purple-400 text-xs font-semibold">
                  💡 Rent {fmt(settings?.monthlyRent)} se {fmt(form.monthlyRent)} ho raha hai — purana amount history mein safe rahega
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Effective From</label>
                    <input value={form.effectiveDate} onChange={(e) => setField("effectiveDate", e.target.value)}
                      type="date"
                      className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-white outline-none text-sm transition" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Reason</label>
                    <input value={form.reason} onChange={(e) => setField("reason", e.target.value)}
                      placeholder="e.g. Annual increase"
                      className="w-full bg-[#06080f] border border-[#1e2235] focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-white placeholder-[#2e3248] outline-none text-sm transition" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/8 px-6 py-4 space-y-3">
            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 4px 20px rgba(168,85,247,0.25)" }}>
                {saving ? "Saving..." : "✓ Save Karo"}
              </motion.button>
              <button onClick={onClose}
                className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Pay Modal (add / edit a payment) ────────────────────────────────
function PayModal({ months, settings, existingPayment, initialMonth, onClose, onSaved, toast }) {
  const isEdit = !!existingPayment;

  const defaultMonth = isEdit
    ? existingPayment.forMonth
    : (initialMonth || oldestUnpaidMonth(months) || CURRENT_MONTH);

  const dueForMonth = months.find((m) => m.month === defaultMonth)?.due;

  const [form, setForm] = useState({
    forMonth: defaultMonth,
    amount:   isEdit ? String(existingPayment.amount) : String(dueForMonth || settings?.monthlyRent || ""),
    paidOn:   isEdit ? existingPayment.paidOn : TODAY,
    reason:   isEdit ? existingPayment.reason : "",
    note:     isEdit ? existingPayment.note   : "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Month badalne pe amount ko us month ke due se auto-suggest karo
  const handleMonthChange = (v) => {
    const monthInfo = months.find((m) => m.month === v);
    setForm((p) => ({
      ...p,
      forMonth: v,
      amount: monthInfo && monthInfo.due > 0 ? String(monthInfo.due) : (p.amount || String(settings?.monthlyRent || "")),
    }));
  };

  const dueDate = `${form.forMonth}-${String(settings?.dueDay || 5).padStart(2, "0")}`;
  const isLate = form.paidOn > dueDate;

  const handleSave = async () => {
    setError("");
    if (!/^\d{4}-\d{2}$/.test(form.forMonth)) { setError("Month select karo"); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Amount required hai"); return; }
    if (!form.paidOn) { setError("Paid on date required hai"); return; }

    setSaving(true);
    try {
      const payload = {
        forMonth: form.forMonth,
        amount:   Number(form.amount),
        paidOn:   form.paidOn,
        reason:   form.reason,
        note:     form.note,
      };
      const { data } = isEdit
        ? await api.patch(`/rent/pay/${existingPayment._id}`, payload)
        : await api.post("/rent/pay", payload);

      toast(isEdit ? "Payment update ho gaya ✅" : `${fmtMonth(form.forMonth)} ka rent record ho gaya! 🎉`);
      onSaved(data.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">

          <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-lg">💰</div>
              <div>
                <p className="text-white font-bold text-sm">{isEdit ? "Payment Edit Karo" : "Rent Pay Karo"}</p>
                <p className="text-[11px] text-gray-500">Kis mahine ka, kitna, kab diya</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Kis Mahine Ka Rent</label>
              <input value={form.forMonth} onChange={(e) => handleMonthChange(e.target.value)}
                type="month"
                className="w-full bg-[#06080f] border border-[#1e2235] focus:border-blue-500/50 rounded-xl px-4 py-3 text-white outline-none text-sm transition" />
              <p className="text-[10px] text-gray-600 mt-1">
                Agle mahine ka pehle dena hai to future month select kar sakte ho — "Advance" mein count hoga
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Amount (₹)</label>
                <input value={form.amount} onChange={(e) => setField("amount", e.target.value)}
                  placeholder="0" type="number" min="0"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-blue-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Paid On</label>
                <input value={form.paidOn} onChange={(e) => setField("paidOn", e.target.value)}
                  type="date"
                  className="w-full bg-[#06080f] border border-[#1e2235] focus:border-blue-500/50 rounded-xl px-4 py-3 text-white outline-none text-sm transition" />
              </div>
            </div>

            {isLate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1.5">
                  ⚠️ Late Hai — Reason (optional)
                </label>
                <input value={form.reason} onChange={(e) => setField("reason", e.target.value)}
                  placeholder="e.g. Paise ka intezaam late hua"
                  className="w-full bg-[#06080f] border border-amber-500/25 focus:border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
              </motion.div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Note (optional)</label>
              <input value={form.note} onChange={(e) => setField("note", e.target.value)}
                placeholder="Koi extra note"
                className="w-full bg-[#06080f] border border-[#1e2235] focus:border-blue-500/50 rounded-xl px-4 py-3 text-white placeholder-[#2e3248] outline-none text-sm transition" />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">⚠️ {error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.25)" }}>
                {saving ? "Saving..." : isEdit ? "✓ Update Karo" : "✓ Rent Pay Karo"}
              </motion.button>
              <button onClick={onClose}
                className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Delete Confirm ───────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel, deleting, label }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCancel} className="fixed inset-0 bg-black/70 z-[70]" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mx-auto mb-4">🗑️</div>
          <p className="text-white font-bold text-center text-sm mb-1">Delete Karna Hai?</p>
          <p className="text-gray-500 text-xs text-center mb-5">{label}</p>
          <div className="flex gap-3">
            <button onClick={onConfirm} disabled={deleting}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
              {deleting ? "..." : "Haan, Delete"}
            </button>
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Month Detail Drawer ─────────────────────────────────────────────
function MonthDrawer({ monthData, months, settings, onClose, onPay, onEditPayment, onDeletePayment }) {
  const sc = STATUS_CONFIG[monthData.status] || STATUS_CONFIG.pending;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0d0f1e] border-l border-white/10 shadow-2xl overflow-y-auto">

        <div className="sticky top-0 bg-[#0d0f1e] border-b border-white/8 px-6 py-5 flex items-center justify-between z-10">
          <div>
            <p className="text-white font-bold text-lg">{fmtMonth(monthData.month)}</p>
            <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
              {sc.emoji} {sc.label}
            </span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/8 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Rent Amount</p>
              <p className="text-white font-bold text-lg mt-1">{fmt(monthData.rentAmount)}</p>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Due Date</p>
              <p className="text-white font-bold text-lg mt-1">{fmtDate(monthData.dueDate)}</p>
            </div>
            <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Paid</p>
              <p className="text-green-400 font-bold text-lg mt-1">{fmt(monthData.totalPaid)}</p>
            </div>
            <div className={`rounded-xl p-3 border ${monthData.due > 0 ? "bg-red-500/8 border-red-500/20" : "bg-white/5 border-white/8"}`}>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Due</p>
              <p className={`font-bold text-lg mt-1 ${monthData.due > 0 ? "text-red-400" : "text-gray-400"}`}>{fmt(monthData.due)}</p>
            </div>
          </div>

          {monthData.status === "late" && monthData.lateDays > 0 && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm font-semibold">⚠️ {monthData.lateDays} din late diya gaya tha</p>
            </div>
          )}

          <button onClick={() => onPay(monthData.month)}
            className="w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.2)" }}>
            💰 Is Mahine Ka Payment Add Karo
          </button>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Payment History</p>
            {monthData.payments.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">Abhi koi payment nahi hai</p>
            ) : (
              <div className="space-y-2">
                {monthData.payments.map((p) => (
                  <div key={p._id} className="bg-[#06080f] border border-[#1e2235] rounded-xl px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-bold text-sm">{fmt(p.amount)}</p>
                        <p className="text-gray-500 text-xs mt-0.5">Paid on {fmtDate(p.paidOn)}</p>
                        {p.reason && <p className="text-amber-400/80 text-[11px] mt-1">⚠️ {p.reason}</p>}
                        {p.note && <p className="text-gray-600 text-[11px] mt-1">{p.note}</p>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => onEditPayment(p)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs">✏️</button>
                        <button onClick={() => onDeletePayment(p)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-xs">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function RentManager() {
  const [settings, setSettings] = useState(null);
  const [months,   setMonths]   = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [payMonth,      setPayMonth]     = useState(null);   // month string to prefill PayModal, or "new"
  const [editPayment,   setEditPayment]  = useState(null);   // payment obj being edited
  const [detailMonth,   setDetailMonth]  = useState(null);   // month obj for drawer
  const [deletePayment, setDeletePayment]= useState(null);
  const [deleting,      setDeleting]     = useState(false);

  const { show: toast, ToastContainer } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/rent", { params: { months: 12 } });
      setSettings(data.data.settings);
      setMonths(data.data.months);
      setStats(data.data.stats);
    } catch (err) {
      toast(err?.response?.data?.error || "Data load nahi hua", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshAfterChange = () => fetchData();

  const openDetail = (m) => setDetailMonth(m);
  // Detail drawer ko latest data ke saath sync rakho jab months refresh ho
  useEffect(() => {
    if (detailMonth) {
      const fresh = months.find((m) => m.month === detailMonth.month);
      if (fresh) setDetailMonth(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const handleDeletePayment = async () => {
    setDeleting(true);
    try {
      await api.delete(`/rent/pay/${deletePayment._id}`);
      toast("Payment delete ho gaya");
      setDeletePayment(null);
      fetchData();
    } catch (err) {
      toast(err?.response?.data?.error || "Delete nahi hua", "error");
    } finally {
      setDeleting(false);
    }
  };

  const noSettingsYet = !loading && (!settings?.monthlyRent || settings.monthlyRent <= 0);

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }} className="text-white p-4 md:p-5 pb-6">
      <ToastContainer />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Room <span className="text-purple-400">Rent</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Shop ka rent — kab diya, time pe diya, kitna baaki hai</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-gray-300 hover:bg-white/5 transition">
            ⚙️ Settings
          </button>
          <button onClick={() => setPayMonth(oldestUnpaidMonth(months) || CURRENT_MONTH)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 4px 20px rgba(168,85,247,0.25)" }}>
            + RENT PAY
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : noSettingsYet ? (
        <div className="bg-white/5 border border-white/8 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-gray-400 font-semibold">Rent settings abhi set nahi hain</p>
          <p className="text-gray-600 text-sm mt-1 mb-5">Pehle monthly rent aur landlord details daalo</p>
          <button onClick={() => setShowSettings(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>
            ⚙️ Settings Karo
          </button>
        </div>
      ) : (
        <>
          {/* Settings summary */}
          <div className="bg-white/5 border border-white/8 rounded-2xl p-4 mb-6 flex flex-wrap gap-6 items-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Landlord</p>
              <p className="text-white font-semibold text-sm mt-0.5">{settings.landlordName || "—"}</p>
              {settings.landlordPhone && <p className="text-gray-500 text-xs">{settings.landlordPhone}</p>}
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Monthly Rent</p>
              <p className="text-purple-400 font-bold text-sm mt-0.5">{fmt(settings.monthlyRent)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Due Date</p>
              <p className="text-white font-semibold text-sm mt-0.5">{settings.dueDay}</p>
            </div>
            {settings.propertyAddress && (
              <div className="flex-1 min-w-[160px]">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Address</p>
                <p className="text-gray-400 text-xs mt-0.5">{settings.propertyAddress}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "This Month", value: STATUS_CONFIG[stats.currentMonthStatus]?.label || "-", color: STATUS_CONFIG[stats.currentMonthStatus]?.text || "text-white", bg: "bg-white/5 border-white/10" },
                { label: "Total Paid (visible months)", value: fmt(stats.totalPaidAllTime), color: "text-green-400", bg: "bg-green-500/8 border-green-500/20" },
                { label: "Total Due (visible months)",  value: fmt(stats.totalDueVisible),  color: "text-red-400",   bg: "bg-red-500/8 border-red-500/20" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border px-4 py-4 ${s.bg}`}>
                  <p className={`font-black text-lg ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Months grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map((m) => {
              const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
              return (
                <motion.div key={m.month} whileHover={{ scale: 1.01 }} onClick={() => openDetail(m)}
                  className={`rounded-2xl border p-4 cursor-pointer transition ${sc.bg} ${sc.border}`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-bold text-sm">{fmtMonth(m.month)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.text}`}>
                      {sc.emoji} {sc.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">Rent: {fmt(m.rentAmount)}</p>
                  <p className="text-gray-400 text-xs">Paid: {fmt(m.totalPaid)}</p>
                  {m.due > 0 && <p className="text-red-400 text-xs font-semibold">Due: {fmt(m.due)}</p>}
                  {m.status === "late" && m.lateDays > 0 && (
                    <p className="text-red-400/80 text-[11px] mt-1">{m.lateDays} din late</p>
                  )}
                  {m.due > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setPayMonth(m.month); }}
                      className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-white transition"
                      style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                      💰 Pay Karo
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal key="settings-modal" settings={settings} onClose={() => setShowSettings(false)}
            onSaved={(updated) => { setSettings((p) => ({ ...p, ...updated })); refreshAfterChange(); }}
            toast={toast} />
        )}
        {payMonth && (
          <PayModal key="pay-modal" months={months} settings={settings}
            existingPayment={null}
            initialMonth={payMonth}
            onClose={() => setPayMonth(null)}
            onSaved={refreshAfterChange}
            toast={toast} />
        )}
        {editPayment && (
          <PayModal key="edit-payment-modal" months={months} settings={settings}
            existingPayment={editPayment}
            onClose={() => setEditPayment(null)}
            onSaved={refreshAfterChange}
            toast={toast} />
        )}
        {detailMonth && (
          <MonthDrawer key="month-drawer" monthData={detailMonth} months={months} settings={settings}
            onClose={() => setDetailMonth(null)}
            onPay={(month) => setPayMonth(month)}
            onEditPayment={(p) => setEditPayment(p)}
            onDeletePayment={(p) => setDeletePayment(p)} />
        )}
        {deletePayment && (
          <DeleteConfirm key="delete-confirm"
            label={`${fmt(deletePayment.amount)} — ${fmtDate(deletePayment.paidOn)} ka payment`}
            deleting={deleting}
            onConfirm={handleDeletePayment}
            onCancel={() => setDeletePayment(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}