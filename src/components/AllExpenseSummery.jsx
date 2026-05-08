"use client";
// src/components/AllExpenseSummery.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// ─── Salary Utils (inline mirror of salaryUtils.js) ──────────────
const calcDaySalary = (attendanceEntry, perDaySalary, overtimeRatePerHour = 0) => {
  if (!attendanceEntry) return 0;
  const status         = typeof attendanceEntry === "string" ? attendanceEntry : (attendanceEntry?.status ?? "absent");
  const overtimeHours  = Number(attendanceEntry?.overtimeHours)  || 0;
  const overtimeAmount = Number(attendanceEntry?.overtimeAmount) || 0;

  switch (status) {
    case "present":
    case "auto-present": return Math.round(perDaySalary);
    case "half-day":     return Math.round(perDaySalary * 0.5);
    case "overtime": {
      let otPay = 0;
      if (overtimeAmount > 0) {
        otPay = overtimeAmount;
      } else if (overtimeHours > 0) {
        const hr = overtimeRatePerHour > 0 ? overtimeRatePerHour : perDaySalary / 8;
        otPay = overtimeHours * hr * 1.5;
      }
      return Math.round(perDaySalary + otPay);
    }
    default: return 0;
  }
};

const getSalaryForDate = (date, emp) => {
  const history = [...(emp.salaryHistory || [])].sort((a, b) => new Date(a.from) - new Date(b.from));
  let perDaySalary = emp.perDaySalary || 0;
  if (history.length > 0) {
    let applicable = null;
    for (const entry of history) { if (entry.from <= date) applicable = entry.salary; else break; }
    if (applicable !== null) perDaySalary = applicable;
  }
  const entry = emp.attendance instanceof Map ? emp.attendance.get(date) : emp.attendance?.[date];
  return calcDaySalary(entry, perDaySalary, emp.overtimeRatePerHour || 0);
};

const getStatus   = (v) => (typeof v === "string" ? v : v?.status  ?? "absent");
const getOTHours  = (v) => (typeof v === "string" ? 0 : Number(v?.overtimeHours)  || 0);
const getOTAmount = (v) => (typeof v === "string" ? 0 : Number(v?.overtimeAmount) || 0);
const getMarkedBy = (v) => (typeof v === "string" ? "manual" : v?.markedBy ?? "manual");

const getEmpStats = (emp) => {
  const entries = Object.entries(emp.attendance || {});
  let present = 0, halfDay = 0, overtime = 0, absent = 0, totalEarned = 0;
  entries.forEach(([date, v]) => {
    const s = getStatus(v);
    totalEarned += getSalaryForDate(date, emp);
    if (s === "present" || s === "auto-present") present++;
    else if (s === "half-day") halfDay++;
    else if (s === "overtime") overtime++;
    else if (s === "absent")   absent++;
  });
  const paidAmount = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  return { present, halfDay, overtime, absent, totalEarned, paidAmount, dueAmount: Math.max(0, totalEarned - paidAmount), total: entries.length };
};

const STATUS_CONFIG = {
  present:        { label: "✓ Present",      bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/30",  ring: "ring-green-400/50"  },
  "auto-present": { label: "⚡ Auto",         bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/30",   ring: "ring-blue-400/50"   },
  "half-day":     { label: "½ Half Day",      bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", ring: "ring-yellow-400/50" },
  overtime:       { label: "⏱ Overtime",      bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", ring: "ring-purple-400/50" },
  absent:         { label: "✗ Absent",        bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30",    ring: "ring-red-400/50"    },
};
const getStatusCfg = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.absent;

const EXPENSE_CATEGORIES  = ["Hardware", "Diesel", "Petrol", "Transport", "Other"];
const SUPER_ADMIN_TIMEOUT = 10 * 60 * 1000;
const TODAY               = new Date().toISOString().split("T")[0];

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const normalizeEmployee = (emp) => {
  let attendance = {};
  if (emp.attendance) {
    if (emp.attendance instanceof Map) attendance = Object.fromEntries(emp.attendance);
    else if (typeof emp.attendance === "object") {
      attendance = Object.fromEntries(
        Object.entries(emp.attendance).filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k))
      );
    }
  }
  return { ...emp, id: emp._id || emp.id, attendance, paidDates: emp.paidDates || [], salaryPayments: emp.salaryPayments || [], salaryHistory: emp.salaryHistory || [] };
};
const normalizeExpense = (e) => ({ ...e, id: e._id || e.id });

// ─── Toast ────────────────────────────────────────────────────────
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
          <motion.div key={t.id} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
            className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg border max-w-xs
              ${t.type === "error" ? "bg-red-500/20 border-red-500/40 text-red-300"
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

// ─── Pagination ───────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition">← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onPageChange(p)}
          className={`w-8 h-8 text-xs rounded-lg font-semibold transition ${currentPage === p ? "bg-amber-400 text-black" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"}`}>{p}</button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition">Next →</button>
    </div>
  );
}

// ─── Super Admin PIN Modal ────────────────────────────────────────
function SuperAdminPinModal({ onSuccess, onClose }) {
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState(false);
  const [shake, setShake]     = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const tryPin = async (val) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post("/api/admin/verify-pin", { pin: val }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) onSuccess();
      else { setError(true); setShake(true); setPin(""); setTimeout(() => setShake(false), 500); }
    } catch { setError(true); setShake(true); setPin(""); setTimeout(() => setShake(false), 500); }
    finally { setLoading(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0f1117] border border-red-500/40 rounded-2xl p-7 w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">🔐</div>
          </div>
          <h3 className="text-white font-bold text-xl text-center mb-1">Super Admin Access</h3>
          <p className="text-gray-400 text-sm text-center mb-6">PIN enter karein</p>
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? "bg-red-400 border-red-400 scale-110" : error ? "border-red-500/50" : "border-gray-600"}`} />
            ))}
          </div>
          <input ref={inputRef} type="password" maxLength={4} value={pin}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setPin(v); setError(false); if (v.length === 4) tryPin(v); }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white text-xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-red-400/50 mb-2"
            placeholder="• • • •" inputMode="numeric" disabled={loading} />
          {error && <p className="text-red-400 text-xs text-center mb-3">❌ Galat PIN</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={() => tryPin(pin)} disabled={loading} className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50">
              {loading ? "Verifying..." : "🔓 Unlock"}
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5 transition">Cancel</button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

// ─── ✅ Overtime Modal — Custom Amount + Hours dono options ───────
function OvertimeModal({ employee, date, onConfirm, onClose }) {
  const [mode,        setMode]        = useState("amount"); // "amount" | "hours"
  const [customAmt,   setCustomAmt]   = useState("");
  const [hours,       setHours]       = useState("2");

  const perDaySalary  = employee.perDaySalary || 0;
  const hourlyRate    = employee.overtimeRatePerHour > 0 ? employee.overtimeRatePerHour : perDaySalary / 8;

  // Preview calculation
  const otPay = mode === "amount"
    ? (Number(customAmt) || 0)
    : (Number(hours) || 0) * hourlyRate * 1.5;
  const totalPay = perDaySalary + otPay;

  const handleConfirm = () => {
    if (mode === "amount") {
      const amt = Number(customAmt);
      if (!amt || amt <= 0) return;
      onConfirm({ overtimeAmount: amt, overtimeHours: 0 });
    } else {
      const h = Number(hours);
      if (!h || h <= 0) return;
      onConfirm({ overtimeAmount: 0, overtimeHours: h });
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70]" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()} className="bg-[#0f1117] border border-purple-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-2xl">⏱</div>
            <div>
              <p className="text-white font-bold">Overtime Mark Karo</p>
              <p className="text-xs text-gray-400">{employee.name} · {fmtDate(date)}</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-white/5 rounded-xl overflow-hidden border border-white/10 mb-5">
            <button onClick={() => setMode("amount")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${mode === "amount" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"}`}>
              ₹ Custom Amount
            </button>
            <button onClick={() => setMode("hours")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${mode === "hours" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"}`}>
              🕐 By Hours
            </button>
          </div>

          {/* ── Custom Amount Mode ── */}
          <AnimatePresence mode="wait">
            {mode === "amount" && (
              <motion.div key="amount" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Overtime Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-lg">₹</span>
                  <input
                    type="text" inputMode="decimal"
                    value={customAmt}
                    onChange={(e) => setCustomAmt(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="e.g. 150"
                    autoFocus
                    className="w-full bg-[#06080f] border border-purple-500/30 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/15 rounded-xl pl-10 pr-4 py-3.5 text-white text-xl font-bold outline-none transition placeholder-gray-700"
                  />
                </div>
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[50, 100, 150, 200, 250, 300].map((amt) => (
                    <button key={amt} onClick={() => setCustomAmt(String(amt))}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition font-semibold ${customAmt === String(amt) ? "bg-purple-500/30 border-purple-400/60 text-purple-300" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"}`}>
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-2">💡 Jo bhi extra kaam ka amount ho woh directly daal do</p>
              </motion.div>
            )}

            {/* ── Hours Mode ── */}
            {mode === "hours" && (
              <motion.div key="hours" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Extra Hours Kaam Kiya</label>
                {/* Quick hour buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((h) => (
                    <button key={h} onClick={() => setHours(String(h))}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition ${hours === String(h) ? "bg-purple-500/30 border-purple-400/60 text-purple-300 ring-1 ring-purple-400/40" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
                      {h}h
                    </button>
                  ))}
                </div>
                <input type="number" min="0.5" max="24" step="0.5" value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-[#06080f] border border-purple-500/30 focus:border-purple-400/60 rounded-xl px-4 py-3 text-white text-center text-lg font-bold outline-none"
                  placeholder="Custom hours..." />
                <p className="text-[11px] text-gray-500 mt-2">Rate: ₹{Math.round(hourlyRate)}/hr × 1.5x = ₹{Math.round(hourlyRate * 1.5)}/hr overtime</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          {otPay > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-purple-500/8 border border-purple-500/20 rounded-xl p-4 mb-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400/70 mb-2">Aaj Ki Salary</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Base (Full Day)</span>
                <span className="text-white font-semibold">₹ {perDaySalary.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Overtime</span>
                <span className="text-purple-400 font-semibold">+ ₹ {Math.round(otPay).toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-purple-500/20 pt-2 flex justify-between">
                <span className="text-white font-bold">Total Aaj Ka</span>
                <span className="text-purple-300 font-black text-xl">₹ {Math.round(totalPay).toLocaleString("en-IN")}</span>
              </div>
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirm}
              disabled={mode === "amount" ? (!customAmt || Number(customAmt) <= 0) : (!hours || Number(hours) <= 0)}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 4px 20px rgba(168,85,247,0.25)" }}>
              ⏱ Save Overtime
            </motion.button>
            <button onClick={onClose} className="px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition text-sm font-semibold">Cancel</button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function AllExpenseSummary() {
  const [activeType,    setActiveType]    = useState("goods");
  const [showAdd,       setShowAdd]       = useState(false);
  const [expenses,      setExpenses]      = useState([]);
  const [employees,     setEmployees]     = useState([]);
  const [detailEmpId,   setDetailEmpId]   = useState(null);
  const [loading,       setLoading]       = useState({ expenses: false, employees: false });
  const [isSuperAdmin,  setIsSuperAdmin]  = useState(false);
  const [showPinModal,  setShowPinModal]  = useState(false);
  const superAdminTimerRef               = useRef(null);
  const { show: toast, ToastContainer }  = useToast();

  const fetchExpenses = useCallback(async () => {
    setLoading((p) => ({ ...p, expenses: true }));
    try { const { data } = await api.get("/expenses"); setExpenses((data.data || []).map(normalizeExpense)); }
    catch (err) { toast(err?.response?.data?.error || "Expenses load nahi hue", "error"); }
    finally { setLoading((p) => ({ ...p, expenses: false })); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading((p) => ({ ...p, employees: true }));
    try { const { data } = await api.get("/employees"); setEmployees((data.data || []).map(normalizeEmployee)); }
    catch (err) { toast(err?.response?.data?.error || "Employees load nahi hue", "error"); }
    finally { setLoading((p) => ({ ...p, employees: false })); }
  }, []);

  useEffect(() => { fetchExpenses(); fetchEmployees(); }, [fetchExpenses, fetchEmployees]);

  const autoMarkToday = useCallback(async () => {
    if (employees.length === 0) return;
    const today      = new Date().toISOString().split("T")[0];
    const activeEmps = employees.filter((e) => e.isActive && !e.attendance?.[today]);
    if (activeEmps.length === 0) return;
    await Promise.allSettled(activeEmps.map((emp) => api.post(`/employees/${emp.id}/attendance`, {})));
    await fetchEmployees();
  }, [employees, fetchEmployees]);

  useEffect(() => {
    if (employees.length === 0) return;
    autoMarkToday();
  }, [employees.length]);

  const activateSuperAdmin = () => {
    setIsSuperAdmin(true); setShowPinModal(false);
    clearTimeout(superAdminTimerRef.current);
    superAdminTimerRef.current = setTimeout(() => setIsSuperAdmin(false), SUPER_ADMIN_TIMEOUT);
  };
  const deactivateSuperAdmin = () => { setIsSuperAdmin(false); clearTimeout(superAdminTimerRef.current); };
  useEffect(() => () => clearTimeout(superAdminTimerRef.current), []);

  const totalDue = employees.reduce((s, emp) => s + getEmpStats(emp).dueAmount, 0);

  const handleAddSave = async (formData) => {
    try {
      if (activeType === "salary") {
        const { data } = await api.post("/employees", {
          name: formData.name, phone: formData.phone, address: formData.address || "",
          joiningDate: formData.joiningDate || TODAY, perDaySalary: Number(formData.perDaySalary),
          overtimeRatePerHour: Number(formData.overtimeRatePerHour) || 0,
        });
        setEmployees((prev) => [...prev, normalizeEmployee(data.data)]);
        toast("Employee register ho gaya! 🎉");
      } else {
        const { data } = await api.post("/expenses", {
          category: formData.category, desc: formData.desc,
          qty: formData.qty ? Number(formData.qty) : 1,
          unit: formData.unit || "pcs",
          rate: formData.rate ? Number(formData.rate) : 0,
          amount: Number(formData.amount), date: formData.date,
        });
        setExpenses((prev) => [...prev, normalizeExpense(data.data)]);
        toast("Expense add ho gaya! ✅");
      }
      setShowAdd(false);
    } catch (err) { toast(err?.response?.data?.error || "Save nahi hua", "error"); }
  };

  const updateEmployeeLocal = (updatedEmp) =>
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? normalizeEmployee(updatedEmp) : e)));

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }} className="text-white p-4 md:p-5 pb-6">
      <ToastContainer />

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense <span className="text-amber-400">Manager</span></h1>
          <p className="text-gray-400 text-sm mt-0.5">Expenses, salary aur attendance track karo</p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-2">
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" /></span>
                <span className="text-red-400 text-xs font-bold">SUPER ADMIN ON</span>
              </div>
              <button onClick={deactivateSuperAdmin} className="px-3 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition">🔒 Lock</button>
            </motion.div>
          ) : (
            <button onClick={() => setShowPinModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-300 rounded-xl text-sm font-medium transition">
              🔐 Super Admin
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[{ key: "goods", label: "Expense" }, { key: "salary", label: "Employee Salary" }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveType(key)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeType === key ? "bg-amber-400 text-black shadow-lg shadow-amber-400/30" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}>
            {label}
          </button>
        ))}
        <button onClick={() => setShowAdd(true)} className="ml-auto px-5 py-2 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 transition shadow-lg shadow-blue-500/30">
          + Add {activeType === "goods" ? "Expense" : "Employee"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeType === "salary" ? (
            <SalarySection employees={employees} setEmployees={setEmployees} totalDue={totalDue}
              onViewProfile={(id) => setDetailEmpId(id)} isSuperAdmin={isSuperAdmin} toast={toast}
              fetchEmployees={fetchEmployees} loading={loading.employees} />
          ) : (
            <ExpenseSection expenses={expenses} setExpenses={setExpenses} toast={toast}
              loading={loading.expenses} isSuperAdmin={isSuperAdmin} />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <Modal onClose={() => setShowAdd(false)}>
            <AddExpenseForm type={activeType} onClose={() => setShowAdd(false)} onSave={handleAddSave} employeeCount={employees.length} />
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPinModal && <SuperAdminPinModal onSuccess={activateSuperAdmin} onClose={() => setShowPinModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {detailEmpId && (() => {
          const emp = employees.find((e) => e.id === detailEmpId);
          if (!emp) return null;
          return (
            <EmployeeDetailDrawer employee={emp} onClose={() => setDetailEmpId(null)}
              onUpdate={updateEmployeeLocal}
              onToggleActive={async () => {
                try {
                  const action = emp.isActive ? "deactivate" : "reactivate";
                  const { data } = await api.patch(`/employees/${emp.id}/status`, { action });
                  updateEmployeeLocal({ ...emp, ...data.data });
                  toast(action === "deactivate" ? "Employee deactivate ho gaya" : "Employee reactivate ho gaya!");
                  setDetailEmpId(null);
                } catch (err) { toast(err?.response?.data?.error || "Status update nahi hua", "error"); }
              }} toast={toast} />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────
function Modal({ onClose, children }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 30 }} transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()} className="bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 my-4">{children}</div>
      </motion.div>
    </>
  );
}

// ─── Expense Section ──────────────────────────────────────────────
const EXPENSES_PER_PAGE = 15;

function ExpenseSection({ expenses, setExpenses, toast, loading, isSuperAdmin }) {
  const [catFilter,   setCatFilter]   = useState("All");
  const [monthFilter, setMonthFilter] = useState("");
  const [sortOrder,   setSortOrder]   = useState("desc");
  const [editingId,   setEditingId]   = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [savingEdit,  setSavingEdit]  = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const goodsOnly  = expenses.filter((e) => !e.type || e.type === "goods");
  const categories = ["All", ...Array.from(new Set(goodsOnly.map((e) => e.category))).sort()];
  const filtered   = goodsOnly
    .filter((e) => catFilter === "All" || e.category === catFilter)
    .filter((e) => monthFilter ? e.date?.startsWith(monthFilter) : true)
    .sort((a, b) => sortOrder === "desc" ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date));

  const totalPages = Math.ceil(filtered.length / EXPENSES_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * EXPENSES_PER_PAGE, currentPage * EXPENSES_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [catFilter, monthFilter, sortOrder]);

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const overallTotal  = goodsOnly.reduce((s, e) => s + e.amount, 0);
  const now           = new Date();
  const monthlyTotal  = goodsOnly.filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, e) => s + e.amount, 0);
  const catColor = (cat) => ({ Hardware: "bg-blue-500/15 text-blue-300 border-blue-500/25", Diesel: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25", Petrol: "bg-orange-500/15 text-orange-300 border-orange-500/25", Transport: "bg-green-500/15 text-green-300 border-green-500/25", Other: "bg-gray-500/15 text-gray-300 border-gray-500/25" }[cat] || "bg-white/10 text-gray-300 border-white/10");

  const startEdit = (exp) => { setEditingId(exp.id); setEditForm({ date: exp.date?.split("T")[0] || exp.date, category: exp.category, desc: exp.desc, qty: exp.qty || "", unit: exp.unit || "pcs", rate: exp.rate || "", amount: exp.amount }); };
  const saveEdit  = async () => {
    setSavingEdit(true);
    try {
      const autoAmt = editForm.qty && editForm.rate ? Number(editForm.qty) * Number(editForm.rate) : Number(editForm.amount);
      const { data } = await api.patch(`/expenses/${editingId}`, { ...editForm, qty: Number(editForm.qty) || undefined, rate: Number(editForm.rate) || undefined, amount: autoAmt });
      setExpenses((prev) => prev.map((e) => e.id === editingId ? normalizeExpense(data.data) : e));
      setEditingId(null); toast("Expense update ho gaya ✅");
    } catch (err) { toast(err?.response?.data?.error || "Update nahi hua", "error"); }
    finally { setSavingEdit(false); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deleteId}`);
      setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
      setDeleteId(null); toast("Expense delete ho gaya 🗑️");
    } catch (err) { toast(err?.response?.data?.error || "Delete nahi hua", "error"); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">📅 This Month</p>
          <p className="text-2xl font-bold text-blue-300">₹ {monthlyTotal.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">🔍 Filtered</p>
          <p className="text-2xl font-bold text-amber-300">₹ {filteredTotal.toLocaleString()}</p>
        </div>
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">💰 Total</p>
          <p className="text-2xl font-bold text-amber-400">₹ {overallTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${catFilter === cat ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 text-gray-400 border-white/10 hover:text-white"}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          {monthFilter && <button onClick={() => setMonthFilter("")} className="text-xs text-gray-400 hover:text-white">✕ Clear</button>}
          <button onClick={() => setSortOrder((p) => p === "desc" ? "asc" : "desc")} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:text-white transition ml-auto">
            {sortOrder === "desc" ? "↓ Newest" : "↑ Oldest"}
          </button>
        </div>
      </div>

      <div className={`bg-[#1a1d27] border rounded-2xl overflow-hidden ${isSuperAdmin ? "border-red-500/30" : "border-white/10"}`}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/10">
          <h2 className="font-semibold text-white">Expense List <span className="text-gray-500 text-sm font-normal">({filtered.length})</span></h2>
          <span className="text-amber-400 font-bold">₹ {filteredTotal.toLocaleString()}</span>
        </div>
        {loading ? <div className="p-10 text-center text-gray-500 animate-pulse">Loading...</div>
          : filtered.length === 0 ? <div className="p-10 text-center text-gray-500">Koi expense nahi mila.</div>
          : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-400 text-xs text-left uppercase tracking-wide bg-white/5">
                      <th className="px-5 py-3">Date</th><th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Description</th><th className="px-5 py-3 text-center">Qty</th>
                      <th className="px-5 py-3 text-right">Rate</th><th className="px-5 py-3 text-right">Amount</th>
                      {isSuperAdmin && <th className="px-5 py-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((e, i) => {
                      const isEditing = editingId === e.id;
                      const autoAmt   = editForm.qty && editForm.rate ? Number(editForm.qty) * Number(editForm.rate) : null;
                      return isEditing ? (
                        <tr key={e.id} className="border-t border-red-500/20 bg-red-500/5">
                          <td className="px-3 py-2"><input type="date" value={editForm.date} onChange={(ev) => setEditForm(p => ({ ...p, date: ev.target.value }))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-full focus:outline-none" /></td>
                          <td className="px-3 py-2">
                            <select value={editForm.category} onChange={(ev) => setEditForm(p => ({ ...p, category: ev.target.value }))} className="bg-[#1a1d27] border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-full">
                              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a1d27]">{c}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2"><input value={editForm.desc} onChange={(ev) => setEditForm(p => ({ ...p, desc: ev.target.value }))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-full" /></td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <input type="text" inputMode="decimal" value={editForm.qty} placeholder="Qty" onChange={(ev) => setEditForm(p => ({ ...p, qty: ev.target.value }))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-14" />
                              <select value={editForm.unit} onChange={(ev) => setEditForm(p => ({ ...p, unit: ev.target.value }))} className="bg-[#1a1d27] border border-white/15 rounded-lg px-1 py-1 text-white text-xs">
                                {["pcs","kg","ltr","box","set","pair","mtr","rft","bag"].map(u => <option key={u} value={u} className="bg-[#1a1d27]">{u}</option>)}
                              </select>
                            </div>
                          </td>
                          <td className="px-3 py-2"><input type="text" inputMode="decimal" value={editForm.rate} placeholder="Rate" onChange={(ev) => setEditForm(p => ({ ...p, rate: ev.target.value }))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-20" /></td>
                          <td className="px-3 py-2">
                            {autoAmt ? <span className="text-green-400 font-bold text-sm">₹{autoAmt.toLocaleString()}</span>
                              : <input type="text" inputMode="decimal" value={editForm.amount} onChange={(ev) => setEditForm(p => ({ ...p, amount: ev.target.value }))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-24" />}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveEdit} disabled={savingEdit} className="text-xs px-2.5 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg font-semibold disabled:opacity-50">{savingEdit ? "..." : "✓ Save"}</button>
                              <button onClick={() => setEditingId(null)} className="text-xs px-2.5 py-1.5 bg-white/10 text-gray-300 rounded-lg">✕</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={e.id} className={`border-t border-white/5 hover:bg-white/[0.03] ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                          <td className="px-5 py-3 text-gray-400 text-sm whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-5 py-3"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${catColor(e.category)}`}>{e.category}</span></td>
                          <td className="px-5 py-3 text-white text-sm">{e.desc}</td>
                          <td className="px-5 py-3 text-gray-300 text-sm text-center">{e.qty ? `${e.qty} ${e.unit || ""}` : "—"}</td>
                          <td className="px-5 py-3 text-gray-400 text-sm text-right">{e.rate ? `₹${e.rate}` : "—"}</td>
                          <td className="px-5 py-3 text-right font-semibold text-green-400 whitespace-nowrap">₹ {e.amount.toLocaleString()}</td>
                          {isSuperAdmin && (
                            <td className="px-5 py-3 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <button onClick={() => startEdit(e)} className="text-xs px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 border border-blue-500/25 rounded-lg">✏️</button>
                                <button onClick={() => setDeleteId(e.id)} className="text-xs px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/25 rounded-lg">🗑️</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 pb-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs text-gray-500">Showing {Math.min((currentPage - 1) * EXPENSES_PER_PAGE + 1, filtered.length)}–{Math.min(currentPage * EXPENSES_PER_PAGE, filtered.length)} of {filtered.length}</p>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </>
          )}
      </div>

      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="fixed inset-0 bg-black/70 z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-[#1a1d27] border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">🗑️</div>
                  <h3 className="text-white font-bold text-lg">Expense Delete Karein?</h3>
                  {(() => { const exp = expenses.find(e => e.id === deleteId); return exp ? (
                    <div className="mt-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                      <p className="text-white text-sm font-semibold">{exp.desc}</p>
                      <p className="text-gray-400 text-xs mt-1">{exp.category} · {fmtDate(exp.date)}</p>
                      <p className="text-red-400 font-bold mt-1">₹ {exp.amount.toLocaleString()}</p>
                    </div>
                  ) : null; })()}
                </div>
                <div className="flex gap-3">
                  <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50">{deleting ? "Deleting..." : "Haan, Delete Karo"}</button>
                  <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Salary Section ───────────────────────────────────────────────
const EMPLOYEES_PER_PAGE = 6;

function SalarySection({ employees, setEmployees, totalDue, onViewProfile, isSuperAdmin, toast, fetchEmployees, loading }) {
  const [selectedId,      setSelectedId]      = useState(null);
  const [filterMonth,     setFilterMonth]     = useState("");
  const [view,            setView]            = useState("attendance");
  const [empFilter,       setEmpFilter]       = useState("active");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading,   setActionLoading]   = useState(null);
  const [currentPage,     setCurrentPage]     = useState(1);

  const activeEmps    = employees.filter((e) => e.isActive);
  const inactiveEmps  = employees.filter((e) => !e.isActive);
  const shownEmps     = empFilter === "active" ? activeEmps : inactiveEmps;
  const totalPages    = Math.ceil(shownEmps.length / EMPLOYEES_PER_PAGE);
  const paginatedEmps = shownEmps.slice((currentPage - 1) * EMPLOYEES_PER_PAGE, currentPage * EMPLOYEES_PER_PAGE);
  const employee      = employees.find((e) => e.id === selectedId);

  useEffect(() => { if (!selectedId && shownEmps.length > 0) setSelectedId(shownEmps[0].id); }, [shownEmps.length]);

  const handleFilterChange = (val) => {
    setEmpFilter(val); setCurrentPage(1);
    const list = val === "active" ? activeEmps : inactiveEmps;
    setSelectedId(list[0]?.id || null);
  };

  // ✅ overtimeAmount + overtimeHours dono support
  const toggleAttendance = async (empId, date, newStatus, superAdmin = false, otData = {}) => {
    try {
      await api.patch(`/employees/${empId}/attendance`, {
        date, status: newStatus,
        ...(superAdmin && { superAdmin: true }),
        ...(newStatus === "overtime" && otData),
      });
      setEmployees((prev) => prev.map((emp) => {
        if (emp.id !== empId) return emp;
        return {
          ...emp, attendance: {
            ...emp.attendance,
            [date]: {
              status: newStatus,
              markedBy: superAdmin ? "superAdmin" : "manual",
              overtimeHours:  otData.overtimeHours  || 0,
              overtimeAmount: otData.overtimeAmount || 0,
            }
          }
        };
      }));
      const label = newStatus === "overtime"
        ? `Overtime (${otData.overtimeAmount > 0 ? `₹${otData.overtimeAmount}` : `${otData.overtimeHours}h`})`
        : { present: "Present", absent: "Absent", "half-day": "Half Day" }[newStatus] || newStatus;
      toast(`${date} → ${label} mark ho gaya`);
    } catch (err) { toast(err?.response?.data?.error || "Attendance update nahi hua", "error"); }
  };

  const markToday  = (empId, status, otData = {}) => toggleAttendance(empId, TODAY, status, false, otData);

  const toggleActive = async (empId) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    setActionLoading(empId);
    try {
      const action   = emp.isActive ? "deactivate" : "reactivate";
      const { data } = await api.patch(`/employees/${empId}/status`, { action });
      setEmployees((prev) => prev.map((e) => e.id === empId ? { ...e, ...data.data } : e));
      toast(action === "deactivate" ? "Employee deactivate ho gaya" : "Employee reactivate ho gaya! ✅");
      if (empId === selectedId) setSelectedId(null);
    } catch (err) { toast(err?.response?.data?.error || "Status update nahi hua", "error"); }
    finally { setActionLoading(null); setDeleteConfirmId(null); }
  };

  const getFiltered = (emp) =>
    Object.entries(emp.attendance || {})
      .filter(([date]) => filterMonth ? date.startsWith(filterMonth) : true)
      .sort(([a], [b]) => new Date(b) - new Date(a));

  const activeSalary = activeEmps.reduce((s, emp) => s + getEmpStats(emp).totalEarned, 0);
  const activePaid   = activeEmps.reduce((s, emp) => s + getEmpStats(emp).paidAmount, 0);

  return (
    <div className="space-y-5">
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Salary Earned (Active)</p>
            <p className="text-3xl font-bold text-amber-400">₹ {activeSalary.toLocaleString()}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-center">
              <p className="text-blue-400 font-bold text-lg">₹ {activePaid.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400">Total Paid ✓</p>
            </div>
            {totalDue > 0 && (
              <div className="bg-orange-500/15 border border-orange-500/40 rounded-xl px-4 py-2 text-center">
                <p className="text-orange-400 font-bold text-lg">₹ {totalDue.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">Total Due ⏳</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active / Inactive Toggle */}
      <div className="flex bg-white/5 rounded-xl overflow-hidden border border-white/10 w-fit">
        <button onClick={() => handleFilterChange("active")} className={`px-5 py-2 text-sm font-semibold transition flex items-center gap-2 ${empFilter === "active" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}>
          <span className="w-2 h-2 rounded-full bg-green-300" /> Active ({activeEmps.length})
        </button>
        <button onClick={() => handleFilterChange("inactive")} className={`px-5 py-2 text-sm font-semibold transition flex items-center gap-2 ${empFilter === "inactive" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}>
          <span className="w-2 h-2 rounded-full bg-gray-500" /> Inactive ({inactiveEmps.length})
        </button>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-10 text-center text-gray-500 animate-pulse">Loading employees...</div>
      ) : shownEmps.length === 0 ? (
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-10 text-center text-gray-500">Koi employee nahi hai.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedEmps.map((emp) => (
              <EmployeeCard key={emp.id} emp={emp} stats={getEmpStats(emp)}
                isSelected={selectedId === emp.id}
                isProcessing={actionLoading === emp.id}
                onSelect={() => setSelectedId(emp.id)}
                onViewProfile={() => onViewProfile(emp.id)}
                onMarkToday={markToday}
                onDeactivate={() => setDeleteConfirmId(emp.id)}
                onReactivate={() => toggleActive(emp.id)}
                isSuperAdmin={isSuperAdmin}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing {Math.min((currentPage - 1) * EMPLOYEES_PER_PAGE + 1, shownEmps.length)}–{Math.min(currentPage * EMPLOYEES_PER_PAGE, shownEmps.length)} of {shownEmps.length}</p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </>
      )}

      {/* Deactivate Confirm */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmId(null)} className="fixed inset-0 bg-black/70 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-[#1a1d27] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">⚠️</div>
                  <h3 className="text-white font-bold text-lg">Employee Deactivate Karein?</h3>
                  <p className="text-gray-400 text-sm mt-2"><span className="text-amber-400 font-semibold">{employees.find(e => e.id === deleteConfirmId)?.name}</span> ko inactive kar diya jayega.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => toggleActive(deleteConfirmId)} disabled={actionLoading === deleteConfirmId} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
                    {actionLoading === deleteConfirmId ? "Processing..." : "Haan, Deactivate"}
                  </button>
                  <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      {employee && (
        <motion.div key={employee.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`bg-[#1a1d27] border rounded-2xl overflow-hidden ${!employee.isActive ? "border-gray-700 border-dashed" : isSuperAdmin ? "border-red-500/30" : "border-white/10"}`}>
          <div className="flex flex-wrap gap-3 justify-between items-center px-5 py-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-lg">{employee.name}</h3>
                {!employee.isActive && <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full uppercase">Inactive</span>}
              </div>
              <p className="text-gray-400 text-xs font-mono">{employee.empId} · ₹{employee.perDaySalary}/day</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              {filterMonth && <button onClick={() => setFilterMonth("")} className="text-xs text-gray-400 hover:text-white px-2">Clear</button>}
              <div className="flex bg-white/5 rounded-lg overflow-hidden border border-white/10">
                {["attendance", "summary"].map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs capitalize transition ${view === v ? "bg-amber-400 text-black font-semibold" : "text-gray-400 hover:text-white"}`}>{v}</button>
                ))}
              </div>
            </div>
          </div>
          {!employee.isActive && (
            <div className="px-5 py-3 bg-gray-800/50 border-b border-white/5 flex items-center justify-between">
              <p className="text-xs text-gray-400">🔒 Inactive employee</p>
              <button onClick={() => toggleActive(employee.id)} className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-lg transition font-semibold">✓ Reactivate</button>
            </div>
          )}
          {view === "attendance" ? (
            <AttendanceTable employee={employee} filteredEntries={getFiltered(employee)}
              onToggle={toggleAttendance} readonly={!employee.isActive && !isSuperAdmin} isSuperAdmin={isSuperAdmin} />
          ) : (
            <SalaryDetailSummary employee={employee} filterMonth={filterMonth}
              onUpdate={(updatedEmp) => setEmployees((prev) => prev.map((e) => e.id === updatedEmp.id ? updatedEmp : e))}
              toast={toast} />
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Employee Card ────────────────────────────────────────────────
function EmployeeCard({ emp, stats, isSelected, isProcessing, onSelect, onViewProfile, onMarkToday, onDeactivate, onReactivate }) {
  const [showOTModal, setShowOTModal] = useState(false);
  const isInactive  = !emp.isActive;
  const todayEntry  = emp.attendance?.[TODAY];
  const todayStatus = todayEntry ? getStatus(todayEntry) : null;
  const todayOTAmt  = todayEntry ? getOTAmount(todayEntry) : 0;
  const todayOTHrs  = todayEntry ? getOTHours(todayEntry) : 0;
  const todayCfg    = todayStatus ? getStatusCfg(todayStatus) : null;
  const todayEarned = getSalaryForDate(TODAY, emp);

  return (
    <>
      <motion.div whileHover={{ scale: 1.01 }} onClick={onSelect}
        className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden
          ${isInactive ? "opacity-70 border-dashed" : ""}
          ${isSelected ? "bg-amber-400/10 border-amber-400/50 shadow-lg shadow-amber-400/10"
          : isInactive ? "bg-[#1a1d27] border-gray-600"
          : "bg-[#1a1d27] border-white/10 hover:border-white/20"}`}>

        {isInactive && <div className="absolute top-3 right-3 text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-semibold uppercase">Inactive</div>}

        <div className="flex justify-between items-start mb-1 pr-16">
          <div>
            <p className={`font-semibold text-base ${isInactive ? "text-gray-400" : "text-white"}`}>{emp.name}</p>
            <p className="text-xs text-amber-400 font-mono mt-0.5">{emp.empId}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
            className="absolute top-5 right-14 text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-gray-300 transition">
            Profile
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">📞 {emp.phone}</p>

        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-gray-400">₹{emp.perDaySalary}/day</span>
          <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">{stats.total} days</span>
        </div>

        {/* 4-stat grid */}
        <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
          <div className="bg-green-500/10 rounded-xl py-2"><p className="text-green-400 font-bold text-base">{stats.present}</p><p className="text-[9px] text-gray-400">Present</p></div>
          <div className="bg-yellow-500/10 rounded-xl py-2"><p className="text-yellow-400 font-bold text-base">{stats.halfDay}</p><p className="text-[9px] text-gray-400">Half</p></div>
          <div className="bg-purple-500/10 rounded-xl py-2"><p className="text-purple-400 font-bold text-base">{stats.overtime}</p><p className="text-[9px] text-gray-400">OT</p></div>
          <div className="bg-red-500/10 rounded-xl py-2"><p className="text-red-400 font-bold text-base">{stats.absent}</p><p className="text-[9px] text-gray-400">Absent</p></div>
        </div>

        {/* Paid / Due */}
        <div className="grid grid-cols-2 gap-2 text-center mb-3">
          <div className="bg-blue-500/10 rounded-xl py-2"><p className="text-blue-400 font-bold text-sm">₹{stats.paidAmount.toLocaleString()}</p><p className="text-[10px] text-gray-400">Paid ✓</p></div>
          <div className={`rounded-xl py-2 ${stats.dueAmount > 0 ? "bg-orange-500/15 border border-orange-500/30" : "bg-white/5"}`}>
            <p className={`font-bold text-sm ${stats.dueAmount > 0 ? "text-orange-400" : "text-gray-500"}`}>₹{stats.dueAmount.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">Due ⏳</p>
          </div>
        </div>

        {!isInactive ? (
          <div className="space-y-2">
            {/* Today status badge */}
            {todayEntry ? (
              <div className={`text-xs rounded-lg px-3 py-1.5 flex items-center justify-between border ${todayCfg?.bg} ${todayCfg?.text} ${todayCfg?.border}`}>
                <span>
                  Aaj: {todayCfg?.label}
                  {todayStatus === "overtime" && (todayOTAmt > 0 ? ` (+₹${todayOTAmt})` : todayOTHrs > 0 ? ` (${todayOTHrs}h)` : "")}
                </span>
                <span className="text-[10px] opacity-60">₹{todayEarned.toLocaleString()}</span>
              </div>
            ) : (
              <div className="text-xs rounded-lg px-3 py-1.5 bg-gray-700/30 text-gray-400 text-center">Aaj ka attendance pending</div>
            )}

            {/* Attendance buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={(e) => { e.stopPropagation(); onMarkToday(emp.id, "present"); }} disabled={isProcessing}
                className={`text-xs py-2 rounded-xl transition font-semibold border ${todayStatus === "present" ? "bg-green-500/30 border-green-400/50 text-green-300 ring-1 ring-green-400/30" : "bg-green-500/10 hover:bg-green-500/25 text-green-400 border-green-500/20"} disabled:opacity-50`}>
                ✓ Present
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMarkToday(emp.id, "absent"); }} disabled={isProcessing}
                className={`text-xs py-2 rounded-xl transition font-semibold border ${todayStatus === "absent" ? "bg-red-500/30 border-red-400/50 text-red-300 ring-1 ring-red-400/30" : "bg-red-500/10 hover:bg-red-500/25 text-red-400 border-red-500/20"} disabled:opacity-50`}>
                ✗ Absent
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={(e) => { e.stopPropagation(); onMarkToday(emp.id, "half-day"); }} disabled={isProcessing}
                className={`text-xs py-2 rounded-xl transition font-semibold border ${todayStatus === "half-day" ? "bg-yellow-500/30 border-yellow-400/50 text-yellow-300 ring-1 ring-yellow-400/30" : "bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-400 border-yellow-500/20"} disabled:opacity-50`}>
                ½ Half Day
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowOTModal(true); }} disabled={isProcessing}
                className={`text-xs py-2 rounded-xl transition font-semibold border ${todayStatus === "overtime" ? "bg-purple-500/30 border-purple-400/50 text-purple-300 ring-1 ring-purple-400/30" : "bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border-purple-500/20"} disabled:opacity-50`}>
                ⏱ Overtime
              </button>
            </div>

            <button onClick={(e) => { e.stopPropagation(); onDeactivate(); }}
              className="w-full text-xs py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-lg transition border border-red-900/50">
              🚫 Deactivate
            </button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onReactivate(); }} disabled={isProcessing}
            className="mt-4 w-full text-xs py-2 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-lg transition font-semibold disabled:opacity-50">
            {isProcessing ? "Processing..." : "✓ Reactivate"}
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showOTModal && (
          <OvertimeModal employee={emp} date={TODAY}
            onConfirm={(otData) => { onMarkToday(emp.id, "overtime", otData); setShowOTModal(false); }}
            onClose={() => setShowOTModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Attendance Table ─────────────────────────────────────────────
function AttendanceTable({ employee, filteredEntries, onToggle, readonly = false, isSuperAdmin = false }) {
  const [addDate,         setAddDate]         = useState("");
  const [confirmPending,  setConfirmPending]  = useState(null);
  const [showOTModalDate, setShowOTModalDate] = useState(null);

  const requestToggle = (empId, date, newStatus) => {
    if (newStatus === "overtime") { setShowOTModalDate(date); return; }
    const isToday = date === TODAY;
    if (isSuperAdmin && !isToday) setConfirmPending({ empId, date, newStatus, currentStatus: getStatus(employee.attendance?.[date]) });
    else onToggle(empId, date, newStatus, false, {});
  };

  const handleAddDate = () => {
    if (!addDate || (readonly && !isSuperAdmin)) return;
    const isToday = addDate === TODAY;
    if (isSuperAdmin && !isToday) { setConfirmPending({ empId: employee.id, date: addDate, newStatus: "present", currentStatus: getStatus(employee.attendance?.[addDate]) }); setAddDate(""); return; }
    onToggle(employee.id, addDate, "present", isSuperAdmin && !isToday, {});
    setAddDate("");
  };

  const otLabel = (entry) => {
    const otAmt = getOTAmount(entry);
    const otHrs = getOTHours(entry);
    if (otAmt > 0) return ` (+₹${otAmt})`;
    if (otHrs > 0) return ` (${otHrs}h)`;
    return "";
  };

  return (
    <div>
      {(!readonly || isSuperAdmin) && (
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex gap-3 items-center flex-wrap">
          <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button onClick={handleAddDate} className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium transition">+ Add Date</button>
          {isSuperAdmin && <span className="text-xs text-red-400/70">⚠️ Past date change pe confirm maanga jayega</span>}
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <div className="p-10 text-center text-gray-500">Is period ka koi attendance record nahi.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-xs text-left uppercase tracking-wide bg-white/5">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Day</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Salary</th>
                <th className="px-5 py-3 text-center">Change</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(([date, entry]) => {
                const status   = getStatus(entry);
                const markedBy = getMarkedBy(entry);
                const isToday  = date === TODAY;
                const canEdit  = !readonly && (isSuperAdmin || isToday);
                const cfg      = getStatusCfg(status);
                const earned   = getSalaryForDate(date, employee);

                return (
                  <tr key={date} className={`border-t border-white/5 hover:bg-white/[0.02] ${isToday ? "ring-1 ring-inset ring-amber-400/20" : ""}`}>
                    <td className="px-5 py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-300 font-mono">{fmtDate(date)}</span>
                        {isToday && <span className="text-[10px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">TODAY</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{new Date(date).toLocaleDateString("en-IN", { weekday: "short" })}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}{status === "overtime" ? otLabel(entry) : ""}
                      </span>
                      {markedBy === "auto" && <span className="ml-2 text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">auto</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {earned > 0 ? <span className={cfg.text}>₹ {earned.toLocaleString()}</span> : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {canEdit ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {["present", "half-day", "overtime", "absent"].map((s) => {
                            const bc  = getStatusCfg(s);
                            const ico = { present: "✓", "half-day": "½", overtime: "⏱", absent: "✗" };
                            const lbl = { present: "P", "half-day": "½", overtime: "OT", absent: "A" };
                            return (
                              <button key={s} onClick={() => requestToggle(employee.id, date, s)}
                                className={`text-xs px-2 py-1 rounded-lg transition font-medium border ${status === s ? `${bc.bg} ${bc.text} ring-1 ${bc.ring}` : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
                                {ico[s]} {lbl[s]}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 block text-center">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Overtime Modal for table */}
      <AnimatePresence>
        {showOTModalDate && (
          <OvertimeModal employee={employee} date={showOTModalDate}
            onConfirm={(otData) => {
              const isToday = showOTModalDate === TODAY;
              if (isSuperAdmin && !isToday) {
                setConfirmPending({ empId: employee.id, date: showOTModalDate, newStatus: "overtime", currentStatus: getStatus(employee.attendance?.[showOTModalDate]), otData });
              } else {
                onToggle(employee.id, showOTModalDate, "overtime", false, otData);
              }
              setShowOTModalDate(null);
            }}
            onClose={() => setShowOTModalDate(null)} />
        )}
      </AnimatePresence>

      {/* Past Date Confirmation */}
      <AnimatePresence>
        {confirmPending && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmPending(null)} className="fixed inset-0 bg-black/75 backdrop-blur-md z-[70]" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-[#0f1117] border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">✏️</div>
                  <h3 className="text-white font-bold text-lg">Past Attendance Change?</h3>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Employee</span><span className="text-white font-semibold text-sm">{employee.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Date</span><span className="text-amber-400 font-mono font-bold text-sm">{fmtDate(confirmPending.date)}</span></div>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Change</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusCfg(confirmPending.currentStatus).bg} ${getStatusCfg(confirmPending.currentStatus).text}`}>{getStatusCfg(confirmPending.currentStatus).label}</span>
                      <span className="text-gray-500">→</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusCfg(confirmPending.newStatus).bg} ${getStatusCfg(confirmPending.newStatus).text}`}>{getStatusCfg(confirmPending.newStatus).label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { onToggle(confirmPending.empId, confirmPending.date, confirmPending.newStatus, true, confirmPending.otData || {}); setConfirmPending(null); }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition">✓ Haan, Change Karo</button>
                  <button onClick={() => setConfirmPending(null)} className="flex-1 py-2.5 border border-white/15 text-gray-300 rounded-xl text-sm hover:bg-white/5">✕ Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Salary Detail Summary ────────────────────────────────────────
function SalaryDetailSummary({ employee, filterMonth, onUpdate, toast }) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount,    setPayAmount]    = useState("");
  const [payNote,      setPayNote]      = useState("");
  const [paying,       setPaying]       = useState(false);

  const allEntries   = Object.entries(employee.attendance || {}).filter(([date]) => filterMonth ? date.startsWith(filterMonth) : true);
  const presentDates = allEntries.filter(([, v]) => { const s = getStatus(v); return s === "present" || s === "auto-present"; }).map(([d]) => d).sort((a, b) => new Date(b) - new Date(a));
  const halfDates    = allEntries.filter(([, v]) => getStatus(v) === "half-day").map(([d]) => d).sort((a, b) => new Date(b) - new Date(a));
  const otDates      = allEntries.filter(([, v]) => getStatus(v) === "overtime").map(([d]) => d).sort((a, b) => new Date(b) - new Date(a));
  const absentDates  = allEntries.filter(([, v]) => getStatus(v) === "absent").map(([d]) => d).sort((a, b) => new Date(b) - new Date(a));

  const totalEarned = allEntries.reduce((s, [date]) => s + getSalaryForDate(date, employee), 0);
  const totalPaid   = (employee.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const totalDue    = Math.max(0, totalEarned - totalPaid);
  const payAmtNum   = Number(payAmount) || 0;

  const handleMarkPaid = async () => {
    if (!payAmtNum || payAmtNum <= 0) return toast("Amount enter karo", "error");
    if (payAmtNum > totalDue) return toast(`Maximum ₹${totalDue.toLocaleString()} pay kar sakte ho`, "error");
    setPaying(true);
    try {
      await api.patch(`/employees/${employee.id}/salary/pay`, { amount: payAmtNum, note: payNote || `₹${payAmtNum.toLocaleString()} payment` });
      onUpdate({ ...employee, salaryPayments: [...(employee.salaryPayments || []), { amount: payAmtNum, paidOn: TODAY, note: payNote || `₹${payAmtNum.toLocaleString()} payment`, dates: [] }] });
      setPayAmount(""); setPayNote(""); setShowPayModal(false);
      toast(`₹${payAmtNum.toLocaleString()} salary paid! 💰`);
    } catch (err) { toast(err?.response?.data?.error || "Payment nahi hua", "error"); }
    finally { setPaying(false); }
  };

  return (
    <div className="p-5 space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-gray-400 mb-1">💼 Total Earned</p>
          <p className="text-2xl font-black text-green-400">₹ {totalEarned.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">{presentDates.length}P · {halfDates.length}H · {otDates.length}OT</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-gray-400 mb-1">✅ Total Paid</p>
          <p className="text-2xl font-black text-blue-400">₹ {totalPaid.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">{(employee.salaryPayments || []).length} payments</p>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${totalDue > 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"}`}>
          <p className="text-[11px] text-gray-400 mb-1">⏳ Total Due</p>
          <p className={`text-2xl font-black ${totalDue > 0 ? "text-orange-400" : "text-gray-500"}`}>₹ {totalDue.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">{totalDue > 0 ? "Baaki hai" : "Fully paid ✓"}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-[#0f1117] border border-white/8 rounded-2xl p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Attendance Breakdown</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Full Days",    count: presentDates.length, dates: presentDates, color: "text-green-400"  },
            { label: "Half Days",    count: halfDates.length,    dates: halfDates,    color: "text-yellow-400" },
            { label: "Overtime",     count: otDates.length,      dates: otDates,      color: "text-purple-400" },
            { label: "Absent",       count: absentDates.length,  dates: absentDates,  color: "text-red-400"    },
          ].map(({ label, count, dates, color }) => (
            <div key={label} className="text-center">
              <p className={`${color} font-black text-xl`}>{count}</p>
              <p className="text-[10px] text-gray-500">{label}</p>
              <p className={`text-[11px] ${color}/70`}>₹{dates.reduce((s, d) => s + getSalaryForDate(d, employee), 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Overtime Detail — show OT amount per day */}
      {otDates.length > 0 && (
        <div>
          <h4 className="text-purple-400 font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />Overtime Days ({otDates.length})
          </h4>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {otDates.map((date) => {
              const entry  = employee.attendance?.[date];
              const otAmt  = getOTAmount(entry);
              const otHrs  = getOTHours(entry);
              const earned = getSalaryForDate(date, employee);
              return (
                <div key={date} className="flex justify-between items-center bg-purple-500/8 border border-purple-500/15 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 text-xs">⏱</span>
                    <span className="text-sm text-gray-200">{fmtDate(date)}</span>
                    <span className="text-xs text-gray-500">{new Date(date).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    {/* ✅ Show how OT was calculated */}
                    {otAmt > 0
                      ? <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">custom ₹{otAmt}</span>
                      : otHrs > 0 && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">{otHrs}h × rate</span>}
                  </div>
                  <span className="text-purple-400 text-xs font-semibold">₹{earned.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Due / Pay section */}
      {totalDue > 0 ? (
        <div className="bg-orange-500/8 border border-orange-500/30 rounded-2xl px-5 py-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div>
              <p className="text-xs text-gray-400">Outstanding Due</p>
              <p className="text-3xl font-black text-orange-400">₹ {totalDue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Earned ₹{totalEarned.toLocaleString()} − Paid ₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setPayAmount(""); setShowPayModal(true); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition border border-white/15">💰 Custom</button>
              <button onClick={() => { setPayAmount(String(totalDue)); setShowPayModal(true); }} className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition shadow-lg">💳 Full Pay</button>
            </div>
          </div>
          {totalEarned > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-blue-400">Paid: {Math.round((totalPaid / totalEarned) * 100)}%</span>
                <span className="text-orange-400">Due: {Math.round((totalDue / totalEarned) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (totalPaid / totalEarned) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      ) : (presentDates.length + halfDates.length + otDates.length > 0) && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div><p className="text-green-400 font-semibold text-sm">Poora salary paid ho gaya!</p><p className="text-xs text-gray-500">Koi due nahi hai.</p></div>
        </div>
      )}

      {/* Present / Half day lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {presentDates.length > 0 && <DayList title="Present Days" count={presentDates.length} color="green" icon="✓" dates={presentDates} employee={employee} />}
        {halfDates.length > 0 && <DayList title="Half Days" count={halfDates.length} color="yellow" icon="½" dates={halfDates} employee={employee} />}
        {absentDates.length > 0 && <DayList title="Absent Days" count={absentDates.length} color="red" icon="✗" dates={absentDates} employee={employee} noSalary />}
      </div>

      {/* Payment History */}
      {(employee.salaryPayments || []).length > 0 && (
        <div>
          <h4 className="text-gray-300 font-semibold mb-3">📋 Payment History <span className="text-xs text-gray-500 font-normal">({employee.salaryPayments.length})</span></h4>
          <div className="space-y-2">
            {(() => {
              let running = 0;
              return [...(employee.salaryPayments || [])].reverse().map((pay, i) => {
                running += pay.amount || 0;
                const remaining = Math.max(0, totalEarned - running);
                return (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold">₹ {(pay.amount || 0).toLocaleString()}</p>
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Paid ✓</span>
                      </div>
                      {pay.note && <p className="text-xs text-gray-400 mt-0.5">{pay.note}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs text-gray-300 font-mono">{fmtDate(pay.paidOn)}</p>
                      <p className="text-[11px] text-gray-600 mt-1">Due left: <span className="text-orange-400">₹{remaining.toLocaleString()}</span></p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Pay Modal */}
      <AnimatePresence>
        {showPayModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPayModal(false)} className="fixed inset-0 bg-black/70 z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-[#1a1d27] border border-orange-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-white font-bold text-lg mb-1">💳 Salary Payment</h3>
                <p className="text-gray-400 text-sm mb-5">{employee.name} — Due: <span className="text-orange-400 font-bold">₹{totalDue.toLocaleString()}</span></p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-300">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₹</span>
                    <input type="text" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={`Max: ${totalDue}`}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" autoFocus />
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[100, 200, 500].filter(v => v <= totalDue).map(v => (
                      <button key={v} onClick={() => setPayAmount(String(v))} className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-gray-300 transition">₹{v}</button>
                    ))}
                    <button onClick={() => setPayAmount(String(totalDue))} className="text-xs px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 rounded-lg text-orange-300 transition ml-auto">Full ₹{totalDue.toLocaleString()}</button>
                  </div>
                </div>
                {payAmtNum > 0 && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl px-4 py-3 mb-4 border ${payAmtNum > totalDue ? "bg-red-500/10 border-red-500/30" : "bg-orange-500/10 border-orange-500/20"}`}>
                    {payAmtNum > totalDue ? <p className="text-red-400 text-sm">⚠️ Amount due se zyada hai</p> : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Pay karoge:</span><span className="text-white font-bold">₹{payAmtNum.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Baad mein:</span><span className={`font-bold ${totalDue - payAmtNum > 0 ? "text-orange-400" : "text-green-400"}`}>₹{(totalDue - payAmtNum).toLocaleString()}</span></div>
                        {totalDue - payAmtNum === 0 && <p className="text-green-400 text-xs">🎉 Poora clear ho jayega!</p>}
                      </div>
                    )}
                  </motion.div>
                )}
                <div className="mb-5">
                  <label className="block text-sm font-medium mb-1 text-gray-300">Note (optional)</label>
                  <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="e.g. September advance..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleMarkPaid} disabled={paying || !payAmtNum || payAmtNum <= 0 || payAmtNum > totalDue}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl text-sm transition disabled:opacity-40">
                    {paying ? "Processing..." : `✓ Pay ₹${payAmtNum ? payAmtNum.toLocaleString() : "—"}`}
                  </button>
                  <button onClick={() => setShowPayModal(false)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Day List ─────────────────────────────────────────────────────
function DayList({ title, count, color, icon, dates, employee, noSalary = false }) {
  const cm = { green: { h: "text-green-400", d: "bg-green-400", r: "bg-green-500/8 border-green-500/15", s: "text-green-400" }, yellow: { h: "text-yellow-400", d: "bg-yellow-400", r: "bg-yellow-500/8 border-yellow-500/15", s: "text-yellow-400" }, red: { h: "text-red-400", d: "bg-red-400", r: "bg-red-500/8 border-red-500/15", s: "text-gray-600" } };
  const c = cm[color] || cm.green;
  return (
    <div>
      <h4 className={`${c.h} font-semibold mb-2 flex items-center gap-2 text-sm`}>
        <span className={`w-2 h-2 rounded-full ${c.d}`} />{title} ({count})
      </h4>
      <div className="space-y-1 max-h-44 overflow-y-auto">
        {dates.map((date) => (
          <div key={date} className={`flex justify-between items-center ${c.r} border rounded-lg px-3 py-2`}>
            <div className="flex items-center gap-2">
              <span className={`${c.h} text-xs`}>{icon}</span>
              <span className="text-sm text-gray-200">{fmtDate(date)}</span>
              <span className="text-xs text-gray-500">{new Date(date).toLocaleDateString("en-IN", { weekday: "short" })}</span>
            </div>
            {noSalary ? <span className="text-gray-600 text-xs">—</span>
              : <span className={`${c.s} text-xs font-semibold`}>₹{getSalaryForDate(date, employee).toLocaleString()}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Employee Detail Drawer ───────────────────────────────────────
function EmployeeDetailDrawer({ employee, onClose, onUpdate, onToggleActive, toast }) {
  const [tab,             setTab]             = useState("profile");
  const [editMode,        setEditMode]        = useState(false);
  const [form,            setForm]            = useState({ name: employee.name, phone: employee.phone, address: employee.address || "" });
  const [showIncForm,     setShowIncForm]     = useState(false);
  const [showToggleConf,  setShowToggleConf]  = useState(false);
  const [incForm,         setIncForm]         = useState({ newSalary: "", reason: "", effectiveDate: TODAY });
  const [savingProfile,   setSavingProfile]   = useState(false);
  const [savingInc,       setSavingInc]       = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const stats = getEmpStats(employee);

  const refreshEmployee = async () => {
    setRefreshing(true);
    try { const { data } = await api.get(`/employees/${employee.id}`); onUpdate(data.data); toast("Refresh ho gaya ✅"); }
    catch (err) { toast(err?.response?.data?.error || "Refresh nahi hua", "error"); }
    finally { setRefreshing(false); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try { const { data } = await api.patch(`/employees/${employee.id}`, { name: form.name, phone: form.phone, address: form.address }); onUpdate({ ...employee, ...data.data }); setEditMode(false); toast("Profile update ho gaya ✅"); }
    catch (err) { toast(err?.response?.data?.error || "Save nahi hua", "error"); }
    finally { setSavingProfile(false); }
  };

  const saveIncrement = async () => {
    if (!incForm.newSalary || !incForm.effectiveDate) return toast("Salary aur Date required hai", "error");
    setSavingInc(true);
    try {
      const { data } = await api.patch(`/employees/${employee.id}/salary`, { newSalary: Number(incForm.newSalary), effectiveDate: incForm.effectiveDate, reason: incForm.reason || "Salary Update" });
      onUpdate({ ...employee, perDaySalary: Number(incForm.newSalary), salaryHistory: data.data.salaryHistory });
      setIncForm({ newSalary: "", reason: "", effectiveDate: TODAY }); setShowIncForm(false); toast(data.message);
    } catch (err) { toast(err?.response?.data?.error || "Update nahi hua", "error"); }
    finally { setSavingInc(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#13151f] border-l border-white/10 shadow-2xl overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 sticky top-0 bg-[#13151f] z-10">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{employee.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${employee.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}>{employee.isActive ? "● Active" : "○ Inactive"}</span>
            </div>
            <p className="text-xs text-amber-400 font-mono">{employee.empId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshEmployee} disabled={refreshing} className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-500/20 border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-300 transition disabled:opacity-50">
              <span className={`text-sm ${refreshing ? "animate-spin" : ""}`}>🔄</span>
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300">✕</button>
          </div>
        </div>

        <div className="flex border-b border-white/10">
          {["profile", "salary"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-semibold capitalize transition ${tab === t ? "text-amber-400 border-b-2 border-amber-400" : "text-gray-400 hover:text-white"}`}>
              {t === "profile" ? "👤 Profile" : "💰 Salary"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "profile" && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl font-black text-black">{employee.name.charAt(0)}</div>
                <div><p className="text-xl font-bold text-white">{employee.name}</p><p className="text-xs text-gray-400">Joined: {fmtDate(employee.joiningDate)}</p></div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { label: "Present", value: stats.present,  color: "text-green-400"  },
                  { label: "Half",    value: stats.halfDay,  color: "text-yellow-400" },
                  { label: "OT",      value: stats.overtime, color: "text-purple-400" },
                  { label: "Absent",  value: stats.absent,   color: "text-red-400"    },
                  { label: "Earned",  value: `₹${(stats.totalEarned / 1000).toFixed(1)}k`, color: "text-amber-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-xl py-3">
                    <p className={`font-bold text-base ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {!editMode ? (
                <div className="space-y-3">
                  {[
                    { label: "Employee ID",    value: employee.empId },
                    { label: "Phone",          value: employee.phone },
                    { label: "Address",        value: employee.address || "—" },
                    { label: "Per Day Salary", value: `₹ ${employee.perDaySalary.toLocaleString()}` },
                    { label: "OT Rate/hr",     value: employee.overtimeRatePerHour > 0 ? `₹${employee.overtimeRatePerHour}` : `₹${Math.round(employee.perDaySalary / 8)} (auto)` },
                    { label: "Joining Date",   value: fmtDate(employee.joiningDate) },
                  ].map((f) => (
                    <div key={f.label} className="flex justify-between items-start bg-white/5 rounded-xl px-4 py-3">
                      <span className="text-gray-400 text-sm shrink-0">{f.label}</span>
                      <span className="text-white text-sm text-right font-medium">{f.value}</span>
                    </div>
                  ))}
                  <button onClick={() => setEditMode(true)} className="w-full mt-2 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-sm font-semibold transition">✏️ Edit Profile</button>
                  <button onClick={() => setShowToggleConf(true)} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition border ${employee.isActive ? "bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-900/40" : "bg-green-500/20 hover:bg-green-500/40 text-green-400 border-green-500/30"}`}>
                    {employee.isActive ? "🚫 Deactivate" : "✅ Reactivate"}
                  </button>
                  <AnimatePresence>
                    {showToggleConf && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className={`rounded-2xl border p-4 space-y-3 ${employee.isActive ? "bg-red-950/40 border-red-500/30" : "bg-green-950/40 border-green-500/30"}`}>
                        <p className="text-sm text-white font-semibold">{employee.isActive ? "⚠️ Confirm Deactivate?" : "✅ Confirm Reactivate?"}</p>
                        <div className="flex gap-2">
                          <button onClick={() => { onToggleActive(); setShowToggleConf(false); }} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${employee.isActive ? "bg-red-600 hover:bg-red-500 text-white" : "bg-green-600 hover:bg-green-500 text-white"}`}>
                            Haan, Confirm
                          </button>
                          <button onClick={() => setShowToggleConf(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 text-sm">Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input label="Name"    value={form.name}    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                  <Input label="Phone"   value={form.phone}   onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
                  <Input label="Address" value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} />
                  <div className="flex gap-3 pt-1">
                    <button onClick={saveProfile} disabled={savingProfile} className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm disabled:opacity-50">{savingProfile ? "Saving..." : "Save"}</button>
                    <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "salary" && (
            <div className="space-y-4">
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-gray-400 text-xs">Per Day Salary</p>
                  <p className="text-3xl font-black text-amber-400">₹ {employee.perDaySalary.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">OT: ₹{Math.round(employee.overtimeRatePerHour > 0 ? employee.overtimeRatePerHour : employee.perDaySalary / 8)}/hr × 1.5x</p>
                </div>
                {employee.isActive && <button onClick={() => setShowIncForm(p => !p)} className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm rounded-xl transition">{showIncForm ? "✕" : "↑ Update"}</button>}
              </div>

              <AnimatePresence>
                {showIncForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-4 space-y-3">
                      <Input label="New Per Day Salary (₹)" type="text" inputMode="decimal" value={incForm.newSalary} onChange={(e) => setIncForm(p => ({ ...p, newSalary: e.target.value }))} />
                      <Input label="Effective Date" type="date" value={incForm.effectiveDate} onChange={(e) => setIncForm(p => ({ ...p, effectiveDate: e.target.value }))} />
                      <Input label="Reason" placeholder="e.g. Annual increment" value={incForm.reason} onChange={(e) => setIncForm(p => ({ ...p, reason: e.target.value }))} />
                      <button onClick={saveIncrement} disabled={savingInc} className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-white font-semibold text-sm rounded-xl disabled:opacity-50">{savingInc ? "Saving..." : "✓ Save"}</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <p className="text-sm font-semibold text-gray-300 mb-3">Salary History</p>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-white/10" />
                  <div className="space-y-3">
                    {[...(employee.salaryHistory || [])].reverse().map((h, i) => (
                      <div key={i} className="relative flex items-start gap-4 pl-8">
                        <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${i === 0 ? "bg-amber-400 text-black" : "bg-white/10 text-gray-400"}`}>{i === 0 ? "★" : "↑"}</div>
                        <div className={`flex-1 rounded-xl p-3 border ${i === 0 ? "bg-amber-400/5 border-amber-400/20" : "bg-white/5 border-white/5"}`}>
                          <div className="flex justify-between items-start">
                            <p className={`font-bold text-lg ${i === 0 ? "text-amber-400" : "text-white"}`}>₹{h.salary.toLocaleString()}<span className="text-xs font-normal text-gray-400 ml-1">/day</span></p>
                            {i === 0 && <span className="text-[10px] bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full">CURRENT</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{fmtDate(h.from)}</p>
                          <p className="text-xs text-gray-500">{h.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────
function AddExpenseForm({ type, onClose, onSave, employeeCount }) {
  const [form,   setForm]   = useState({ date: TODAY, unit: "pcs" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const autoAmount   = form.qty && form.rate ? (Number(form.qty) * Number(form.rate)).toFixed(2) : "";
  const empIdPreview = form.name && form.phone ? (() => {
    const np = form.name.trim().replace(/\s+/g, "").substring(0, 3).toUpperCase();
    const pp = String(form.phone).replace(/\D/g, "").slice(-4);
    return `${np}-${pp}-${String(employeeCount + 1).padStart(3, "0")}`;
  })() : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (type === "salary") {
        if (!form.name || !form.phone || !form.perDaySalary) { toast("Name, Phone aur Salary required hai"); return; }
        await onSave({ name: form.name, phone: form.phone, address: form.address || "", joiningDate: form.joiningDate || TODAY, perDaySalary: Number(form.perDaySalary), overtimeRatePerHour: Number(form.overtimeRatePerHour) || 0 });
      } else {
        if (!form.category || !form.desc || !form.date) { alert("Category, Item aur Date required hai"); return; }
        const finalAmount = autoAmount || form.amount;
        if (!finalAmount || Number(finalAmount) <= 0) { alert("Amount ya Qty × Rate zaroori hai"); return; }
        await onSave({ category: form.category, desc: form.desc, qty: form.qty ? Number(form.qty) : 1, unit: form.unit || "pcs", rate: form.rate ? Number(form.rate) : 0, amount: Number(finalAmount), date: form.date });
      }
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-5 text-white">{type === "salary" ? "👤 New Employee" : "🧾 Add Expense"}</h2>

      {type === "goods" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Category *</label>
              <select value={form.category || ""} onChange={(e) => set("category", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="" className="bg-[#1a1d27]">Select...</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a1d27]">{c}</option>)}
              </select>
            </div>
          </div>
          <Input label="Item / Description *" value={form.desc || ""} onChange={(e) => set("desc", e.target.value)} placeholder="e.g. Welding Rod, Diesel..." />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Qty" type="text" inputMode="decimal" value={form.qty || ""} onChange={(e) => set("qty", e.target.value)} placeholder="e.g. 5" />
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Unit</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none">
                {["pcs","kg","ltr","box","set","pair","mtr","rft","bag"].map(u => <option key={u} value={u} className="bg-[#1a1d27]">{u}</option>)}
              </select>
            </div>
            <Input label="Rate (₹)" type="text" inputMode="decimal" value={form.rate || ""} onChange={(e) => set("rate", e.target.value)} placeholder="per unit" />
          </div>
          {autoAmount ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
              <div><p className="text-xs text-gray-400">Auto Calculated</p><p className="text-xs text-gray-500">{form.qty} {form.unit} × ₹{form.rate}</p></div>
              <p className="text-xl font-black text-green-400">₹ {Number(autoAmount).toLocaleString()}</p>
            </div>
          ) : (
            <Input label="Amount (₹) *" type="text" inputMode="decimal" value={form.amount || ""} onChange={(e) => set("amount", e.target.value)} placeholder="Direct amount..." />
          )}
        </div>
      )}

      {type === "salary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name *" placeholder="Ramesh Kumar" onChange={(e) => set("name", e.target.value)} />
            <Input label="Phone *" type="tel" placeholder="98XXXXXXXX" onChange={(e) => set("phone", e.target.value)} />
          </div>
          <Input label="Address" placeholder="Ghar ka pata" onChange={(e) => set("address", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Per Day Salary (₹) *" type="text" inputMode="decimal" placeholder="e.g. 600" onChange={(e) => set("perDaySalary", e.target.value)} />
            <Input label="Joining Date" type="date" onChange={(e) => set("joiningDate", e.target.value)} />
          </div>
          <div>
            <Input label="Custom OT Rate/hr (₹) — Optional" type="text" inputMode="decimal" placeholder="Khali choddo = auto (salary÷8)" onChange={(e) => set("overtimeRatePerHour", e.target.value)} />
            {form.perDaySalary && (
              <p className="text-[11px] text-gray-500 mt-1">Auto: ₹{Math.round(Number(form.perDaySalary) / 8)}/hr × 1.5 = ₹{Math.round((Number(form.perDaySalary) / 8) * 1.5)}/hr</p>
            )}
          </div>
          {empIdPreview && <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5"><p className="text-xs text-gray-400">ID Preview:</p><p className="text-blue-300 font-mono font-bold">{empIdPreview}</p></div>}
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-400 font-semibold">💡 Salary Rule:</p>
            <p className="text-xs text-gray-500">Present → <strong className="text-amber-400">1×</strong> · Half Day → <strong className="text-yellow-400">0.5×</strong> · Overtime → <strong className="text-purple-400">Full + OT amount</strong> · Absent → <strong className="text-red-400">₹0</strong></p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={handleSave} disabled={saving} className="bg-amber-400 text-black font-semibold px-5 py-2 rounded-lg hover:bg-amber-300 transition disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        <button onClick={onClose} className="border border-white/10 text-gray-300 px-5 py-2 rounded-lg hover:bg-white/5 transition">Cancel</button>
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────
function Input({ label, ...props }) {
  return (
    <div className="flex-1 min-w-0">
      {label && <label className="block text-sm font-medium mb-1 text-gray-300">{label}</label>}
      <input {...props} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50" />
    </div>
  );
}