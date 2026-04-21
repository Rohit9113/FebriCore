//src/components/AllExpenseSummery.jsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const EXPENSE_TYPES = {
  goods:  "Expense",
  salary: "Employee Salary",
};

const SUPER_ADMIN_TIMEOUT = 10 * 60 * 1000;
const EXPENSE_CATEGORIES  = ["Material", "Hardware", "Fuel", "Designs", "Other"];

// ── Pagination defaults ──────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const fmtDate  = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const getStatus   = (entry) => (typeof entry === "string" ? entry : entry?.status  ?? "absent");
const getMarkedBy = (entry) => (typeof entry === "string" ? "manual" : entry?.markedBy ?? "manual");
const getToday = () => new Date().toISOString().split("T")[0];

const normalizeEmployee = (emp) => {
  let attendance = {};
  if (emp.attendance) {
    if (emp.attendance instanceof Map) {
      attendance = Object.fromEntries(emp.attendance);
    } else if (typeof emp.attendance === "object") {
      attendance = Object.fromEntries(
        Object.entries(emp.attendance).filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k))
      );
    }
  }
  return { ...emp, id: emp._id || emp.id, attendance, paidDates: emp.paidDates || [], salaryPayments: emp.salaryPayments || [], salaryHistory: emp.salaryHistory || [] };
};

const normalizeExpense = (exp) => ({ ...exp, id: exp._id || exp.id });

const getEmpStats = (emp) => {
  const entries    = Object.entries(emp.attendance || {});
  const present    = entries.filter(([, v]) => getStatus(v) === "present" || getStatus(v) === "auto-present").length;
  const absent     = entries.filter(([, v]) => getStatus(v) === "absent").length;
  const totalEarned = present * emp.perDaySalary;
  const paidAmount  = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const dueAmount   = Math.max(0, totalEarned - paidAmount);
  return { present, absent, totalEarned, paidAmount, dueAmount, total: entries.length };
};

/* ── Pagination Hook ─────────────────────────────────────────────── */
function usePagination(items, defaultPageSize = 10) {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * pageSize;
  const paged      = items.slice(start, start + pageSize);

  const goTo   = useCallback((p) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);
  const reset  = useCallback(() => setPage(1), []);

  // Reset to page 1 when items change (filter/search)
  const prevLen = useRef(items.length);
  useEffect(() => {
    if (prevLen.current !== items.length) { setPage(1); prevLen.current = items.length; }
  }, [items.length]);

  return { paged, page: safePage, totalPages, pageSize, setPageSize: (s) => { setPageSize(s); setPage(1); }, goTo, reset, total: items.length, start: start + 1, end: Math.min(start + pageSize, items.length) };
}

/* ── Pagination UI ───────────────────────────────────────────────── */
function PaginationBar({ page, totalPages, goTo, total, start, end, pageSize, setPageSize, label = "entries" }) {
  if (total === 0) return null;
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) pages.push(i);
    else if (pages[pages.length - 1] !== "...") pages.push("...");
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-white/5 bg-white/[0.01]">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Show</span>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
          className="bg-white/10 border border-white/10 rounded-md px-2 py-1 text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400">
          {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s} className="bg-[#1a1d27]">{s}</option>)}
        </select>
        <span>/ {total} {label}</span>
        {total > 0 && <span className="text-gray-600">· Showing {start}–{end}</span>}
      </div>
      <div className="flex items-center gap-1">
        <PgBtn onClick={() => goTo(1)}        disabled={page === 1}           label="«" />
        <PgBtn onClick={() => goTo(page - 1)} disabled={page === 1}           label="‹" />
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-2 text-gray-600 text-xs">…</span>
          ) : (
            <PgBtn key={p} onClick={() => goTo(p)} active={p === page} label={String(p)} />
          )
        )}
        <PgBtn onClick={() => goTo(page + 1)} disabled={page === totalPages} label="›" />
        <PgBtn onClick={() => goTo(totalPages)} disabled={page === totalPages} label="»" />
      </div>
    </div>
  );
}

function PgBtn({ onClick, disabled, active, label }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-semibold transition
        ${active ? "bg-amber-400 text-black shadow" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"}
        disabled:opacity-30 disabled:cursor-not-allowed`}>
      {label}
    </button>
  );
}

/* ── Search Bar ──────────────────────────────────────────────────── */
function SearchBar({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/30 transition" />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs transition">✕</button>
      )}
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────────────────── */
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
            initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg border max-w-xs
              ${t.type === "error" ? "bg-red-500/20 border-red-500/40 text-red-300" : t.type === "warning" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-green-500/20 border-green-500/40 text-green-300"}`}>
            {t.type === "error" ? "❌ " : t.type === "warning" ? "⚠️ " : "✅ "}{t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return { show, ToastContainer };
}

/* ── Super Admin PIN ─────────────────────────────────────────────── */
function SuperAdminPinModal({ onSuccess, onClose }) {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState(false);
  const [shake,   setShake]   = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const tryPin = async (val) => {
    if (val.length < 4) return;
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await api.post("/admin/verify-pin", { pin: val }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data.success) {
        onSuccess();
      } else {
        setError(true); setShake(true); setPin("");
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError(true); setShake(true); setPin("");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0f1117] border border-red-500/40 rounded-2xl p-7 w-full max-w-sm shadow-2xl shadow-red-500/10">
          <div className="flex items-center justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">🔐</div>
          </div>
          <h3 className="text-white font-bold text-xl text-center mb-1">Super Admin Access</h3>
          <p className="text-gray-400 text-sm text-center mb-6">PIN enter karein</p>
          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2,3].map((i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${i < pin.length ? "bg-red-400 border-red-400 scale-110" : error ? "border-red-500/50 bg-red-500/10" : "border-gray-600"}`} />
            ))}
          </div>
          <input ref={inputRef} type="password" maxLength={4} value={pin}
            onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 4); setPin(val); setError(false); if (val.length === 4) tryPin(val); }}
            onKeyDown={(e) => { if (e.key === "Enter") tryPin(pin); if (e.key === "Escape") onClose(); }}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white text-xl tracking-[0.5em] font-mono placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400/50 mb-2 disabled:opacity-50"
            placeholder="• • • •" inputMode="numeric" />
          {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs text-center mb-3">❌ Galat PIN</motion.p>}
          <div className="flex gap-3 mt-4">
            <button onClick={() => tryPin(pin)} disabled={loading || pin.length < 4} className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50">
              {loading ? "Verifying..." : "🔓 Unlock"}
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5 transition">Cancel</button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ROOT COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function AllExpenseSummary() {
  const [activeType,  setActiveType]  = useState("goods");
  const [showAdd,     setShowAdd]     = useState(false);
  const [expenses,    setExpenses]    = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [detailEmpId, setDetailEmpId] = useState(null);
  const [loading,     setLoading]     = useState({ expenses: false, employees: false });
  const [isSuperAdmin,  setIsSuperAdmin]  = useState(false);
  const [showPinModal,  setShowPinModal]  = useState(false);
  const [newEmpPassword, setNewEmpPassword] = useState(null);
  const superAdminTimerRef = useRef(null);
  const { show: toast, ToastContainer } = useToast();

  /* ── Fetch ──────────────────────────────────────────────────── */
  const fetchExpenses = useCallback(async () => {
    setLoading((p) => ({ ...p, expenses: true }));
    try {
      const { data } = await api.get("/expenses");
      setExpenses((data.data || []).map(normalizeExpense));
    } catch (err) {
      toast(err?.response?.data?.error || "Expenses load nahi hue", "error");
    } finally {
      setLoading((p) => ({ ...p, expenses: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading((p) => ({ ...p, employees: true }));
    try {
      const { data } = await api.get("/employees");
      setEmployees((data.data || []).map(normalizeEmployee));
    } catch (err) {
      toast(err?.response?.data?.error || "Employees load nahi hue", "error");
    } finally {
      setLoading((p) => ({ ...p, employees: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchEmployees();
  }, [fetchExpenses, fetchEmployees]);

  /* ── autoMarkToday ───────────────────────────────────────────── */
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
    const now      = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(() => {
      autoMarkToday();
      const interval = setInterval(autoMarkToday, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, midnight - now);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length]);

  /* ── Super Admin ─────────────────────────────────────────────── */
  const activateSuperAdmin = () => {
    setIsSuperAdmin(true); setShowPinModal(false);
    clearTimeout(superAdminTimerRef.current);
    superAdminTimerRef.current = setTimeout(() => setIsSuperAdmin(false), SUPER_ADMIN_TIMEOUT);
  };
  const deactivateSuperAdmin = () => { setIsSuperAdmin(false); clearTimeout(superAdminTimerRef.current); };
  useEffect(() => () => clearTimeout(superAdminTimerRef.current), []);

  /* ── Totals ──────────────────────────────────────────────────── */
  const totalDue = employees.reduce((s, emp) => s + getEmpStats(emp).dueAmount, 0);
  const totalSalary = employees.reduce((s, emp) => {
    const present = Object.values(emp.attendance || {}).filter((v) => { const st = getStatus(v); return st==="present"||st==="auto-present"; }).length;
    return s + present * emp.perDaySalary;
  }, 0);

  /* ── Add ─────────────────────────────────────────────────────── */
  const handleAddSave = async (formData) => {
    try {
      if (activeType === "salary") {
        const { data } = await api.post("/employees", {
          name: formData.name, phone: formData.phone, address: formData.address || "",
          joiningDate: formData.joiningDate || getToday(), perDaySalary: Number(formData.perDaySalary),
        });
        setEmployees((prev) => [...prev, normalizeEmployee(data.data)]);
        setShowAdd(false);
        if (data.data?.loginPassword) {
          setNewEmpPassword({
            name:     data.data.name,
            empId:    data.data.empId,
            phone:    data.data.phone,
            password: data.data.loginPassword,
          });
        } else {
          toast("Employee register ho gaya! 🎉");
        }
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
        setShowAdd(false);
      }
    } catch (err) { toast(err?.response?.data?.error || "Save nahi hua", "error"); }
  };

  const updateEmployeeLocal = (updatedEmp) =>
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? normalizeEmployee(updatedEmp) : e)));

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "'Sora','Segoe UI',sans-serif" }} className="text-white p-4 md:p-5 pb-6">
      <ToastContainer />

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Expense <span className="text-amber-400">Manager</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Track expenses, salaries & employee profiles</p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-red-400 text-xs font-bold tracking-wide">SUPER ADMIN ON</span>
              </div>
              <button onClick={deactivateSuperAdmin} className="px-3 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition font-medium">🔒 Lock</button>
            </motion.div>
          ) : (
            <button onClick={() => setShowPinModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-300 rounded-xl text-sm font-medium transition group">
              <span className="text-base group-hover:scale-110 transition-transform">🔐</span> Super Admin
            </button>
          )}
        </div>
      </div>

      {/* Super Admin Banner */}
      <AnimatePresence>
        {isSuperAdmin && (
          <motion.div initial={{ opacity:0, height:0, marginBottom:0 }} animate={{ opacity:1, height:"auto", marginBottom:16 }} exit={{ opacity:0, height:0, marginBottom:0 }} className="overflow-hidden">
            <div className="bg-red-500/8 border border-red-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-300 font-semibold text-sm">Super Admin Mode Active</p>
                <p className="text-gray-400 text-xs">{activeType === "goods" ? "Expenses edit aur delete kar sakte hain." : "Koi bhi past attendance edit kar sakte hain."}</p>
              </div>
              <button onClick={deactivateSuperAdmin} className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition font-semibold whitespace-nowrap">🔒 Lock Now</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.keys(EXPENSE_TYPES).map((type) => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeType === type ? "bg-amber-400 text-black shadow-lg shadow-amber-400/30" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}>
            {EXPENSE_TYPES[type]}
          </button>
        ))}
        <button onClick={() => setShowAdd(true)} className="ml-auto px-5 py-2 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 transition shadow-lg shadow-blue-500/30">
          + Add {EXPENSE_TYPES[activeType]}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeType} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
          {activeType === "salary" ? (
            <SalarySection employees={employees} setEmployees={setEmployees} totalSalary={totalSalary} totalDue={totalDue}
              onViewProfile={(id) => setDetailEmpId(id)} isSuperAdmin={isSuperAdmin} toast={toast} fetchEmployees={fetchEmployees} loading={loading.employees} />
          ) : (
            <ExpenseSection expenses={expenses} setExpenses={setExpenses} toast={toast} loading={loading.expenses} isSuperAdmin={isSuperAdmin} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Modal */}
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

      {/* New Employee Password Modal */}
      <AnimatePresence>
        {newEmpPassword && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-[#0f1117] border border-green-500/40 rounded-2xl p-7 w-full max-w-sm shadow-2xl shadow-green-500/10">
                <div className="flex items-center justify-center mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-3xl">🎉</div>
                </div>
                <h3 className="text-white font-bold text-xl text-center mb-1">Employee Register Ho Gaya!</h3>
                <p className="text-gray-400 text-sm text-center mb-5">Login credentials note kar lo — yeh <span className="text-red-400 font-semibold">sirf ek baar</span> dikhenge</p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Name</span><span className="text-white font-semibold text-sm">{newEmpPassword.name}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Employee ID</span><span className="text-amber-400 font-mono text-sm">{newEmpPassword.empId}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Phone (Login)</span><span className="text-white font-mono text-sm">{newEmpPassword.phone}</span></div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-5">
                  <p className="text-xs text-gray-400 mb-1">🔑 Login Password</p>
                  <p className="text-green-300 font-mono font-black text-2xl tracking-widest text-center py-2">{newEmpPassword.password}</p>
                  <p className="text-xs text-gray-500 text-center mt-1">Phone: <span className="text-gray-300">{newEmpPassword.phone}</span> · Password: <span className="text-gray-300">{newEmpPassword.password}</span></p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                  <p className="text-red-400 text-xs font-semibold">⚠️ Yeh password dobara nahi dikhega — abhi note kar lo ya employee ko bata do</p>
                </div>
                <button onClick={() => { setNewEmpPassword(null); toast(`${newEmpPassword.name} register ho gaya! 🎉`); }} className="w-full py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition">✅ Note Kar Liya — Close</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailEmpId && (() => {
          const drawerEmp = employees.find((e) => e.id === detailEmpId);
          if (!drawerEmp) return null;
          return (
            <EmployeeDetailDrawer employee={drawerEmp} onClose={() => setDetailEmpId(null)}
              onUpdate={(updatedEmp) => updateEmployeeLocal(updatedEmp)}
              onToggleActive={async () => {
                try {
                  const action = drawerEmp.isActive ? "deactivate" : "reactivate";
                  const { data } = await api.patch(`/employees/${drawerEmp.id}/status`, { action });
                  updateEmployeeLocal({ ...drawerEmp, ...data.data });
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

/* ── Modal Wrapper ───────────────────────────────────────────────── */
function Modal({ onClose, children }) {
  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div initial={{ opacity:0, scale:0.92, y:30 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.92, y:30 }} transition={{ duration:0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()} className="bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 my-4">
          {children}
        </div>
      </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPENSE SECTION — with Search, Amount Filter, Pagination
══════════════════════════════════════════════════════════════════ */
function ExpenseSection({ expenses, setExpenses, toast, loading, isSuperAdmin }) {
  const [catFilter,    setCatFilter]    = useState("All");
  const [monthFilter,  setMonthFilter]  = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [sortBy,       setSortBy]       = useState("date");
  const [sortOrder,    setSortOrder]    = useState("desc");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [minAmount,    setMinAmount]    = useState("");
  const [maxAmount,    setMaxAmount]    = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [savingEdit,   setSavingEdit]   = useState(false);
  const [deleteId,     setDeleteId]     = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const goodsOnly  = expenses.filter((e) => !e.type || e.type === "goods");
  const categories = ["All", ...Array.from(new Set(goodsOnly.map((e) => e.category))).sort()];

  // ── Active filter count badge ─────────────────────────────────
  const activeFilterCount = [catFilter !== "All", monthFilter, dateFrom, dateTo, minAmount, maxAmount, searchQuery].filter(Boolean).length;

  // ── Filtered + sorted list ────────────────────────────────────
  const filtered = useMemo(() => {
    let list = goodsOnly
      .filter((e) => catFilter === "All" || e.category === catFilter)
      .filter((e) => monthFilter ? e.date?.startsWith(monthFilter) : true)
      .filter((e) => {
        if (!dateFrom && !dateTo) return true;
        const d = e.date?.split("T")[0] || e.date;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo   && d > dateTo)   return false;
        return true;
      })
      .filter((e) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (e.desc?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q));
      })
      .filter((e) => {
        if (minAmount && e.amount < Number(minAmount)) return false;
        if (maxAmount && e.amount > Number(maxAmount)) return false;
        return true;
      });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date")     cmp = new Date(a.date) - new Date(b.date);
      else if (sortBy === "amount") cmp = a.amount - b.amount;
      else if (sortBy === "category") cmp = (a.category||"").localeCompare(b.category||"");
      return sortOrder === "desc" ? -cmp : cmp;
    });
    return list;
  }, [goodsOnly, catFilter, monthFilter, dateFrom, dateTo, searchQuery, minAmount, maxAmount, sortBy, sortOrder]); // eslint-disable-line

  const pagination = usePagination(filtered, 10);

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const overallTotal  = goodsOnly.reduce((s, e) => s + e.amount, 0);
  const now = new Date();
  const monthlyTotal  = goodsOnly.filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, e) => s + e.amount, 0);

  const catColor = (cat) => ({ Hardware:"bg-blue-500/15 text-blue-300 border-blue-500/25", Fuel:"bg-yellow-500/15 text-yellow-300 border-yellow-500/25", Designs:"bg-purple-500/15 text-purple-300 border-purple-500/25", Material:"bg-orange-500/15 text-orange-300 border-orange-500/25", Other:"bg-gray-500/15 text-gray-300 border-gray-500/25" }[cat] || "bg-white/10 text-gray-300 border-white/10");

  const clearAllFilters = () => {
    setCatFilter("All"); setMonthFilter(""); setDateFrom(""); setDateTo("");
    setSearchQuery(""); setMinAmount(""); setMaxAmount("");
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setEditForm({ date: exp.date?.split("T")[0] || exp.date, category: exp.category, desc: exp.desc, qty: exp.qty || "", unit: exp.unit || "pcs", rate: exp.rate || "", amount: exp.amount });
  };

  const saveEdit = async () => {
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">📅 Monthly Expense</p>
          <p className="text-xs text-gray-500 mb-1">{now.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</p>
          <p className="text-2xl font-bold text-blue-300">₹ {monthlyTotal.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">🔍 Filtered Total</p>
          <p className="text-xs text-gray-500 mb-1">{activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount>1?"s":""} active` : "All categories"}</p>
          <p className="text-2xl font-bold text-amber-300">₹ {filteredTotal.toLocaleString()}</p>
        </div>
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">💰 Total Expense</p>
          <p className="text-2xl font-bold text-amber-400">₹ {overallTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-4 space-y-3">
        {/* Top row: search + filter toggle */}
        <div className="flex gap-2 items-center flex-wrap">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by item name or category..." className="flex-1 min-w-[200px]" />
          <button onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition whitespace-nowrap
              ${showFilters ? "bg-amber-400/20 border-amber-400/50 text-amber-300" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"}`}>
            🎛️ Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-black text-xs font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs px-3 py-2 bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/25 rounded-xl transition">
              ✕ Clear All
            </button>
          )}
        </div>

        {/* Expandable filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
              <div className="pt-2 space-y-3 border-t border-white/5">
                {/* Category pills */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setCatFilter(cat)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${catFilter === cat ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 text-gray-400 border-white/10 hover:border-white/25 hover:text-white"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Month</p>
                    <div className="flex items-center gap-2">
                      <input type="month" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setDateFrom(""); setDateTo(""); }}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Date From</p>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setMonthFilter(""); }}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Date To</p>
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setMonthFilter(""); }}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full" />
                  </div>
                </div>

                {/* Amount range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Min Amount (₹)</p>
                    <input type="text" inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value.replace(/\D/g,""))} placeholder="e.g. 500"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Max Amount (₹)</p>
                    <input type="text" inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value.replace(/\D/g,""))} placeholder="e.g. 10000"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full" />
                  </div>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sort By:</p>
                  {[["date","📅 Date"],["amount","💰 Amount"],["category","🏷️ Category"]].map(([val, label]) => (
                    <button key={val} onClick={() => { if (sortBy === val) setSortOrder(p => p==="desc"?"asc":"desc"); else { setSortBy(val); setSortOrder("desc"); } }}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1 ${sortBy===val?"bg-blue-500/20 text-blue-300 border-blue-500/30":"bg-white/5 text-gray-400 border-white/10 hover:text-white"}`}>
                      {label} {sortBy===val && (sortOrder==="desc"?"↓":"↑")}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className={`bg-[#1a1d27] border rounded-2xl overflow-hidden ${isSuperAdmin ? "border-red-500/30" : "border-white/10"}`}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/10">
          <h2 className="font-semibold text-white flex items-center gap-2">
            Expense List
            <span className="text-gray-500 text-sm font-normal">({filtered.length} entries)</span>
            {isSuperAdmin && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">🔓 EDIT MODE</span>}
          </h2>
          <span className="text-amber-400 font-bold">₹ {filteredTotal.toLocaleString()}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500 animate-pulse">Loading expenses...</div>
        ) : pagination.paged.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 text-4xl mb-3">🔍</p>
            <p className="text-gray-400 font-medium">Koi expense nahi mila</p>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} className="mt-3 text-xs text-amber-400 hover:underline">Saare filters hata do</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-gray-400 text-xs text-left uppercase tracking-wide ${isSuperAdmin ? "bg-red-500/5" : "bg-white/5"}`}>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Item / Description</th>
                  <th className="px-5 py-3 text-center">Qty</th>
                  <th className="px-5 py-3 text-right">Rate</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  {isSuperAdmin && <th className="px-5 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pagination.paged.map((e, i) => {
                  const isEditing = editingId === e.id;
                  const autoAmt   = editForm.qty && editForm.rate ? Number(editForm.qty) * Number(editForm.rate) : null;
                  return isEditing ? (
                    <tr key={e.id} className="border-t border-red-500/20 bg-red-500/5">
                      <td className="px-3 py-2"><input type="date" value={editForm.date} onChange={(ev) => setEditForm(p=>({...p,date:ev.target.value}))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-full focus:outline-none focus:ring-1 focus:ring-red-400" /></td>
                      <td className="px-3 py-2">
                        <select value={editForm.category} onChange={(ev) => setEditForm(p=>({...p,category:ev.target.value}))} className="bg-[#1a1d27] border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-full focus:outline-none">
                          {EXPENSE_CATEGORIES.map(c=><option key={c} value={c} className="bg-[#1a1d27]">{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input value={editForm.desc} onChange={(ev) => setEditForm(p=>({...p,desc:ev.target.value}))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-full focus:outline-none" /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <input type="text" inputMode="decimal" value={editForm.qty} placeholder="Qty" onChange={(ev) => setEditForm(p=>({...p,qty:ev.target.value}))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-14 focus:outline-none focus:ring-1 focus:ring-red-400" />
                          <select value={editForm.unit} onChange={(ev) => setEditForm(p=>({...p,unit:ev.target.value}))} className="bg-[#1a1d27] border border-white/15 rounded-lg px-1 py-1 text-white text-xs focus:outline-none">
                            {["pcs","kg","ltr","box","set","pair","mtr","rft","bag"].map(u=><option key={u} value={u} className="bg-[#1a1d27]">{u}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-2"><input type="text" inputMode="decimal" value={editForm.rate} placeholder="Rate" onChange={(ev) => setEditForm(p=>({...p,rate:ev.target.value}))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-20 focus:outline-none focus:ring-1 focus:ring-red-400" /></td>
                      <td className="px-3 py-2">
                        {autoAmt ? (
                          <span className="text-green-400 font-bold text-sm">₹{autoAmt.toLocaleString()}</span>
                        ) : (
                          <input type="text" inputMode="decimal" value={editForm.amount} onChange={(ev) => setEditForm(p=>({...p,amount:ev.target.value}))} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-white text-xs w-24 focus:outline-none focus:ring-1 focus:ring-red-400" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-center">
                          <button onClick={saveEdit} disabled={savingEdit} className="text-xs px-2.5 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg font-semibold transition disabled:opacity-50">{savingEdit?"...":"✓ Save"}</button>
                          <button onClick={() => setEditingId(null)} className="text-xs px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition">✕</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={e.id} className={`border-t border-white/5 transition-colors ${isSuperAdmin?"hover:bg-red-500/[0.03]":"hover:bg-white/[0.04]"} ${i%2!==0?"bg-white/[0.015]":""}`}>
                      <td className="px-5 py-3 text-gray-400 text-sm whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-5 py-3"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${catColor(e.category)}`}>{e.category}</span></td>
                      <td className="px-5 py-3 text-white text-sm">
                        {searchQuery ? (
                          <HighlightText text={e.desc} query={searchQuery} />
                        ) : e.desc}
                      </td>
                      <td className="px-5 py-3 text-gray-300 text-sm text-center">{e.qty?`${e.qty} ${e.unit||""}`:"—"}</td>
                      <td className="px-5 py-3 text-gray-400 text-sm text-right">{e.rate?`₹${e.rate}`:"—"}</td>
                      <td className="px-5 py-3 text-right font-semibold text-green-400 whitespace-nowrap">₹ {e.amount.toLocaleString()}</td>
                      {isSuperAdmin && (
                        <td className="px-5 py-3 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button onClick={() => startEdit(e)} className="text-xs px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 border border-blue-500/25 rounded-lg transition font-medium">✏️ Edit</button>
                            <button onClick={() => setDeleteId(e.id)} className="text-xs px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/25 rounded-lg transition font-medium">🗑️ Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <PaginationBar {...pagination} label="expenses" />
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDeleteId(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e)=>e.stopPropagation()} className="bg-[#1a1d27] border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">🗑️</div>
                  <h3 className="text-white font-bold text-lg">Expense Delete Karein?</h3>
                  <p className="text-gray-400 text-sm mt-2">Yeh record permanently delete ho jayega.</p>
                  {(() => { const exp = expenses.find(e=>e.id===deleteId); return exp ? (
                    <div className="mt-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                      <p className="text-white text-sm font-semibold">{exp.desc}</p>
                      <p className="text-gray-400 text-xs mt-1">{exp.category} · {fmtDate(exp.date)}</p>
                      <p className="text-red-400 font-bold mt-1">₹ {exp.amount.toLocaleString()}</p>
                    </div>
                  ) : null; })()}
                </div>
                <div className="flex gap-3">
                  <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50">{deleting?"Deleting...":"Haan, Delete Karo"}</button>
                  <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5 transition">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Highlight search match ─────────────────────────────────────── */
function HighlightText({ text = "", query = "" }) {
  if (!query) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5">{part}</mark>
          : part
      )}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SALARY SECTION — with Search, Sort, Pagination on cards
══════════════════════════════════════════════════════════════════ */
function SalarySection({ employees, setEmployees, totalSalary, totalDue, onViewProfile, isSuperAdmin, toast, fetchEmployees, loading }) {
  const [selectedId,       setSelectedId]       = useState(null);
  const [filterMonth,      setFilterMonth]       = useState("");
  const [view,             setView]              = useState("attendance");
  const [empFilter,        setEmpFilter]         = useState("active");
  const [deleteConfirmId,  setDeleteConfirmId]   = useState(null);
  const [actionLoading,    setActionLoading]     = useState(null);

  // ── Employee search & sort ────────────────────────────────────
  const [empSearch,  setEmpSearch]  = useState("");
  const [empSortBy,  setEmpSortBy]  = useState("name");
  const [empSortDir, setEmpSortDir] = useState("asc");
  const [dueFilter,  setDueFilter]  = useState(false);

  const activeEmps   = employees.filter((e) => e.isActive);
  const inactiveEmps = employees.filter((e) => !e.isActive);

  const shownEmps = useMemo(() => {
    let list = empFilter === "active" ? activeEmps : inactiveEmps;
    if (empSearch) {
      const q = empSearch.toLowerCase();
      list = list.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.empId?.toLowerCase().includes(q)
      );
    }
    if (dueFilter) {
      list = list.filter(e => getEmpStats(e).dueAmount > 0);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (empSortBy === "name")     cmp = a.name.localeCompare(b.name);
      else if (empSortBy === "due") cmp = getEmpStats(a).dueAmount - getEmpStats(b).dueAmount;
      else if (empSortBy === "earned") cmp = getEmpStats(a).totalEarned - getEmpStats(b).totalEarned;
      else if (empSortBy === "present") cmp = getEmpStats(a).present - getEmpStats(b).present;
      else if (empSortBy === "salary") cmp = a.perDaySalary - b.perDaySalary;
      return empSortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [employees, empFilter, empSearch, dueFilter, empSortBy, empSortDir]); // eslint-disable-line

  const pagination = usePagination(shownEmps, 9);

  useEffect(() => {
    if (!selectedId && shownEmps.length > 0) setSelectedId(shownEmps[0].id);
  }, [shownEmps, selectedId]);

  const handleFilterChange = (val) => {
    setEmpFilter(val); setEmpSearch(""); setDueFilter(false);
    const list = val === "active" ? activeEmps : inactiveEmps;
    setSelectedId(list[0]?.id || null);
  };

  const employee = employees.find((e) => e.id === selectedId);

  const toggleSort = (field) => {
    if (empSortBy === field) setEmpSortDir(d => d === "asc" ? "desc" : "asc");
    else { setEmpSortBy(field); setEmpSortDir("asc"); }
  };

  const toggleAttendance = async (empId, date, newStatus, superAdmin = false) => {
    try {
      await api.patch(`/employees/${empId}/attendance`, { date, status: newStatus, ...(superAdmin && { superAdmin: true }) });
      setEmployees((prev) => prev.map((emp) => {
        if (emp.id !== empId) return emp;
        return { ...emp, attendance: { ...emp.attendance, [date]: { status: newStatus, markedBy: "manual" } } };
      }));
      toast(`${date} → ${newStatus} mark ho gaya`);
    } catch (err) { toast(err?.response?.data?.error || "Attendance update nahi hua", "error"); }
  };

  const markToday = (empId, status) => toggleAttendance(empId, getToday(), status, false);

  const toggleActive = async (empId) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    setActionLoading(empId);
    try {
      const action = emp.isActive ? "deactivate" : "reactivate";
      const { data } = await api.patch(`/employees/${empId}/status`, { action });
      setEmployees((prev) => prev.map((e) => e.id === empId ? { ...e, ...data.data } : e));
      toast(action === "deactivate" ? "Employee deactivate ho gaya" : "Employee reactivate ho gaya! ✅");
      if (empId === selectedId) setSelectedId(null);
    } catch (err) { toast(err?.response?.data?.error || "Status update nahi hua", "error"); }
    finally { setActionLoading(null); setDeleteConfirmId(null); }
  };

  const getFiltered = (emp) => Object.entries(emp.attendance || {}).filter(([date]) => filterMonth ? date.startsWith(filterMonth) : true).sort(([a],[b]) => new Date(b)-new Date(a));

  const activeSalary = activeEmps.reduce((s, emp) => {
    const present = Object.values(emp.attendance || {}).filter((v) => { const st = getStatus(v); return st==="present"||st==="auto-present"; }).length;
    return s + present * emp.perDaySalary;
  }, 0);

  const SortBtn = ({ field, label }) => (
    <button onClick={() => toggleSort(field)}
      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition flex items-center gap-1
        ${empSortBy===field?"bg-blue-500/20 text-blue-300 border-blue-500/30":"bg-white/5 text-gray-400 border-white/10 hover:text-white"}`}>
      {label} {empSortBy===field && (empSortDir==="asc"?"↑":"↓")}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Salary Earned (Active)</p>
            <p className="text-3xl font-bold text-amber-400">₹ {activeSalary.toLocaleString()}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-center">
              <p className="text-blue-400 font-bold text-lg">₹ {(activeSalary-totalDue).toLocaleString()}</p>
              <p className="text-[11px] text-gray-400">Total Paid ✓</p>
            </div>
            {totalDue>0 && (
              <div className="bg-orange-500/15 border border-orange-500/40 rounded-xl px-4 py-2 text-center">
                <p className="text-orange-400 font-bold text-lg">₹ {totalDue.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">Total Due ⏳</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active/Inactive + Search + Sort toolbar */}
      <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-4 space-y-3">
        {/* Top: tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white/5 rounded-xl overflow-hidden border border-white/10">
            <button onClick={()=>handleFilterChange("active")} className={`px-5 py-2 text-sm font-semibold transition flex items-center gap-2 ${empFilter==="active"?"bg-green-500 text-white":"text-gray-400 hover:text-white"}`}>
              <span className="w-2 h-2 rounded-full bg-green-300 inline-block" /> Active ({activeEmps.length})
            </button>
            <button onClick={()=>handleFilterChange("inactive")} className={`px-5 py-2 text-sm font-semibold transition flex items-center gap-2 ${empFilter==="inactive"?"bg-gray-600 text-white":"text-gray-400 hover:text-white"}`}>
              <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Inactive ({inactiveEmps.length})
            </button>
          </div>
          {/* Due filter toggle */}
          <button onClick={() => setDueFilter(p=>!p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition
              ${dueFilter ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
            ⏳ Due Baki {dueFilter && "✓"}
          </button>
        </div>

        {/* Search */}
        <SearchBar value={empSearch} onChange={setEmpSearch} placeholder="Search by name, phone, or employee ID..." />

        {/* Sort options */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Sort:</span>
          <SortBtn field="name"    label="A–Z Name" />
          <SortBtn field="due"     label="💰 Due" />
          <SortBtn field="earned"  label="💼 Earned" />
          <SortBtn field="present" label="📅 Present" />
          <SortBtn field="salary"  label="₹ Salary" />
          {empSearch && (
            <span className="ml-auto text-xs text-gray-500">{shownEmps.length} result{shownEmps.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-10 text-center text-gray-500 animate-pulse">Loading employees...</div>
      ) : pagination.paged.length === 0 ? (
        <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-10 text-center">
          <p className="text-gray-400 text-4xl mb-3">🔍</p>
          <p className="text-gray-400 font-medium">
            {empSearch ? `"${empSearch}" ke liye koi result nahi` : empFilter==="inactive" ? "Koi inactive employee nahi hai." : "Koi active employee nahi hai."}
          </p>
          {empSearch && <button onClick={() => setEmpSearch("")} className="mt-3 text-xs text-amber-400 hover:underline">Search clear karo</button>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagination.paged.map((emp) => {
              const stats        = getEmpStats(emp);
              const isInactive   = !emp.isActive;
              const isProcessing = actionLoading === emp.id;
              return (
                <motion.div key={emp.id} whileHover={{ scale:1.02 }} onClick={()=>setSelectedId(emp.id)}
                  className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden ${isInactive?"opacity-70 border-dashed":""} ${selectedId===emp.id?"bg-amber-400/10 border-amber-400/50 shadow-lg shadow-amber-400/10":isInactive?"bg-[#1a1d27] border-gray-600":"bg-[#1a1d27] border-white/10 hover:border-white/20"}`}>
                  {isInactive && <div className="absolute top-3 right-3 text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Inactive</div>}
                  <div className="flex justify-between items-start mb-1 pr-16">
                    <div>
                      <p className={`font-semibold text-base ${isInactive?"text-gray-400":"text-white"}`}>
                        {empSearch ? <HighlightText text={emp.name} query={empSearch} /> : emp.name}
                      </p>
                      <p className="text-xs text-amber-400 font-mono mt-0.5">{emp.empId}</p>
                    </div>
                    <button onClick={(e)=>{e.stopPropagation();onViewProfile(emp.id);}} className="absolute top-5 right-14 text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-gray-300 transition">Profile</button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">📞 {emp.phone}</p>
                  {isInactive && emp.deactivatedOn && <p className="text-xs text-red-400/70 mb-2">Deactivated: {fmtDate(emp.deactivatedOn)}</p>}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-400">₹ {emp.perDaySalary}/day</span>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">{stats.total} days tracked</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center mb-2">
                    <div className="bg-green-500/10 rounded-xl py-2"><p className="text-green-400 font-bold text-lg">{stats.present}</p><p className="text-[10px] text-gray-400">Present Days</p></div>
                    <div className="bg-red-500/10 rounded-xl py-2"><p className="text-red-400 font-bold text-lg">{stats.absent}</p><p className="text-[10px] text-gray-400">Absent Days</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center mb-3">
                    <div className="bg-blue-500/10 rounded-xl py-2"><p className="text-blue-400 font-bold text-sm">₹{stats.paidAmount.toLocaleString()}</p><p className="text-[10px] text-gray-400">Paid ✓</p></div>
                    <div className={`rounded-xl py-2 ${stats.dueAmount>0?"bg-orange-500/15 border border-orange-500/30":"bg-white/5"}`}>
                      <p className={`font-bold text-sm ${stats.dueAmount>0?"text-orange-400":"text-gray-500"}`}>₹{stats.dueAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">Due ⏳</p>
                    </div>
                  </div>
                  {!isInactive ? (
                    <div className="mt-3 space-y-2">
                      {(() => {
                        const todayEntry = emp.attendance?.[getToday()];
                        const todayStatus = todayEntry ? getStatus(todayEntry) : null;
                        const todayBy    = todayEntry ? getMarkedBy(todayEntry) : null;
                        if (todayEntry) return (
                          <div className={`text-xs rounded-lg px-3 py-1.5 flex items-center justify-between ${todayStatus==="absent"?"bg-red-500/10 text-red-300":todayBy==="auto"?"bg-blue-500/10 text-blue-300":"bg-green-500/10 text-green-300"}`}>
                            <span>Aaj: {todayStatus==="auto-present"?"⚡ Auto-Present":todayStatus==="present"?"✓ Present":"✗ Absent"}</span>
                          </div>
                        );
                        return <div className="text-xs rounded-lg px-3 py-1.5 bg-gray-700/30 text-gray-400 text-center">Aaj ka attendance pending</div>;
                      })()}
                      <div className="flex gap-2">
                        <button onClick={(e)=>{e.stopPropagation();markToday(emp.id,"present");}} disabled={isProcessing} className="flex-1 text-xs py-1.5 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-lg transition disabled:opacity-50">✓ Present Today</button>
                        <button onClick={(e)=>{e.stopPropagation();markToday(emp.id,"absent");}} disabled={isProcessing} className="flex-1 text-xs py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition disabled:opacity-50">✗ Absent Today</button>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation();setDeleteConfirmId(emp.id);}} className="w-full text-xs py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-lg transition border border-red-900/50">🚫 Deactivate Employee</button>
                    </div>
                  ) : (
                    <button onClick={(e)=>{e.stopPropagation();toggleActive(emp.id);}} disabled={isProcessing} className="mt-4 w-full text-xs py-2 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-lg transition font-semibold disabled:opacity-50">
                      {isProcessing?"Processing...":"✓ Reactivate Employee"}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Cards Pagination */}
          <div className="bg-[#1a1d27] border border-white/10 rounded-2xl overflow-hidden">
            <PaginationBar {...pagination} label="employees" />
          </div>
        </>
      )}

      {/* Deactivate Confirm */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDeleteConfirmId(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e)=>e.stopPropagation()} className="bg-[#1a1d27] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">⚠️</div>
                  <h3 className="text-white font-bold text-lg">Employee Deactivate Karein?</h3>
                  <p className="text-gray-400 text-sm mt-2"><span className="text-amber-400 font-semibold">{employees.find(e=>e.id===deleteConfirmId)?.name}</span> ko inactive kar diya jayega.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>toggleActive(deleteConfirmId)} disabled={actionLoading===deleteConfirmId} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50">
                    {actionLoading===deleteConfirmId?"Processing...":"Haan, Deactivate Karo"}
                  </button>
                  <button onClick={()=>setDeleteConfirmId(null)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5 transition">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      {employee && (
        <motion.div key={employee.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          className={`bg-[#1a1d27] border rounded-2xl overflow-hidden ${!employee.isActive?"border-gray-700 border-dashed":isSuperAdmin?"border-red-500/30":"border-white/10"}`}>
          <div className="flex flex-wrap gap-3 justify-between items-center px-5 py-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-lg">{employee.name}</h3>
                {!employee.isActive && <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-semibold uppercase">Inactive</span>}
                {isSuperAdmin && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">🔓 Admin Edit</span>}
              </div>
              <p className="text-gray-400 text-xs font-mono">{employee.empId} · ₹{employee.perDaySalary}/day</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input type="month" value={filterMonth} onChange={(e)=>setFilterMonth(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              {filterMonth && <button onClick={()=>setFilterMonth("")} className="text-xs text-gray-400 hover:text-white px-2">Clear</button>}
              <div className="flex bg-white/5 rounded-lg overflow-hidden border border-white/10">
                {["attendance","summary"].map((v)=>(
                  <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 text-xs capitalize transition ${view===v?"bg-amber-400 text-black font-semibold":"text-gray-400 hover:text-white"}`}>{v}</button>
                ))}
              </div>
            </div>
          </div>
          {!employee.isActive && (
            <div className="px-5 py-3 bg-gray-800/50 border-b border-white/5 flex items-center justify-between">
              <p className="text-xs text-gray-400">🔒 Inactive employee.{isSuperAdmin?" Super Admin mode mein attendance edit ho sakti hai.":""}{employee.deactivatedOn&&` Deactivated: ${fmtDate(employee.deactivatedOn)}`}</p>
              <button onClick={()=>toggleActive(employee.id)} className="text-xs px-3 py-1.5 bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded-lg transition font-semibold whitespace-nowrap ml-3">✓ Reactivate</button>
            </div>
          )}
          {view==="attendance" ? (
            <AttendanceTable employee={employee} filteredEntries={getFiltered(employee)} onToggle={toggleAttendance} readonly={!employee.isActive&&!isSuperAdmin} isSuperAdmin={isSuperAdmin} />
          ) : (
            <SalaryDetailSummary employee={employee} filterMonth={filterMonth} onUpdate={(updatedEmp)=>setEmployees((prev)=>prev.map((e)=>e.id===updatedEmp.id?updatedEmp:e))} toast={toast} />
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ── Attendance Table ────────────────────────────────────────────── */
function AttendanceTable({ employee, filteredEntries, onToggle, readonly=false, isSuperAdmin=false }) {
  const [addDate,         setAddDate]         = useState("");
  const [addMsg,          setAddMsg]          = useState(null);
  const [confirmPending,  setConfirmPending]  = useState(null);
  const [attSearch,       setAttSearch]       = useState("");
  const [attStatusFilter, setAttStatusFilter] = useState("all");

  const requestToggle = (empId, date, newStatus) => {
    const isToday = date === getToday();
    if (isSuperAdmin && !isToday) setConfirmPending({ empId, date, newStatus, currentStatus: getStatus(employee.attendance?.[date]) });
    else onToggle(empId, date, newStatus, false);
  };

  const confirmChange = () => {
    if (!confirmPending) return;
    onToggle(confirmPending.empId, confirmPending.date, confirmPending.newStatus, true);
    setConfirmPending(null);
  };

  const handleAddDate = () => {
    if (!addDate || (readonly && !isSuperAdmin)) return;
    const isToday  = addDate === getToday();
    const existing = employee.attendance?.[addDate];
    if (isSuperAdmin && !isToday && existing) { setConfirmPending({ empId:employee.id, date:addDate, newStatus:"present", currentStatus:getStatus(existing) }); setAddDate(""); return; }
    onToggle(employee.id, addDate, "present", isSuperAdmin && !isToday);
    setAddMsg({ type:"success", text:`${fmtDate(addDate)} — Present mark ho gaya.` });
    setAddDate(""); setTimeout(()=>setAddMsg(null),3000);
  };

  // Filter attendance entries by search + status
  const displayedEntries = useMemo(() => {
    let entries = filteredEntries;
    if (attSearch) {
      entries = entries.filter(([date]) => date.includes(attSearch) || fmtDate(date).toLowerCase().includes(attSearch.toLowerCase()));
    }
    if (attStatusFilter !== "all") {
      entries = entries.filter(([, v]) => {
        const s = getStatus(v);
        if (attStatusFilter === "present")  return s === "present" || s === "auto-present";
        if (attStatusFilter === "absent")   return s === "absent";
        return true;
      });
    }
    return entries;
  }, [filteredEntries, attSearch, attStatusFilter]);

  const pagination = usePagination(displayedEntries, 15);

  const statusLabel = (s) => s==="present"?"✓ Present":s==="auto-present"?"⚡ Auto-Present":"✗ Absent";
  const presentCount = filteredEntries.filter(([,v])=>{const s=getStatus(v);return s==="present"||s==="auto-present";}).length;
  const absentCount  = filteredEntries.filter(([,v])=>getStatus(v)==="absent").length;

  return (
    <div>
      {/* Mini stats strip */}
      <div className="flex gap-3 px-5 py-2.5 border-b border-white/5 bg-white/[0.02] flex-wrap">
        <span className="text-xs text-green-400 font-semibold">✓ {presentCount} Present</span>
        <span className="text-xs text-red-400 font-semibold">✗ {absentCount} Absent</span>
        <span className="text-xs text-gray-500">Total: {filteredEntries.length} records</span>
      </div>

      {/* Search + Status filter */}
      <div className="flex gap-2 px-5 py-3 border-b border-white/5 flex-wrap items-center">
        <SearchBar value={attSearch} onChange={setAttSearch} placeholder="Date search (e.g. 2025-01)..." className="flex-1 min-w-[160px] max-w-xs" />
        <div className="flex bg-white/5 rounded-lg overflow-hidden border border-white/10">
          {[["all","All"],["present","✓ Present"],["absent","✗ Absent"]].map(([val,label])=>(
            <button key={val} onClick={()=>setAttStatusFilter(val)}
              className={`px-3 py-1.5 text-xs font-medium transition ${attStatusFilter===val?"bg-amber-400 text-black":"text-gray-400 hover:text-white"}`}>{label}</button>
          ))}
        </div>
      </div>

      {(!readonly || isSuperAdmin) && (
        <div className={`px-5 py-3 border-b border-white/5 space-y-2 ${isSuperAdmin?"bg-red-500/5":"bg-white/[0.02]"}`}>
          <div className="flex gap-3 items-center flex-wrap">
            <input type="date" value={addDate} onChange={(e)=>{setAddDate(e.target.value);setAddMsg(null);}}
              className={`border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 ${isSuperAdmin?"bg-red-500/5 border-red-500/20 focus:ring-red-400/50":"bg-white/5 border-white/10 focus:ring-amber-400"}`} />
            <button onClick={handleAddDate} className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${isSuperAdmin?"bg-red-500 hover:bg-red-400 text-white":"bg-blue-500 hover:bg-blue-400 text-white"}`}>
              + {isSuperAdmin?"Admin: Date Override":"Add Date"}
            </button>
            <span className="text-xs text-gray-500">{isSuperAdmin?"⚠️ Past date change pe confirmation maanga jayega":"Sirf aaj ka din edit ho sakta hai"}</span>
          </div>
          {addMsg && <div className={`text-xs rounded-lg px-3 py-2 ${addMsg.type==="info"?"bg-yellow-500/10 text-yellow-300 border border-yellow-500/20":"bg-green-500/10 text-green-300 border border-green-500/20"}`}>{addMsg.text}</div>}
        </div>
      )}

      {pagination.paged.length===0 ? (
        <div className="p-10 text-center text-gray-500">
          {attSearch || attStatusFilter!=="all" ? "Filter ke saath koi record nahi mila." : "No attendance records for selected period."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-gray-400 text-sm text-left ${isSuperAdmin?"bg-red-500/5":"bg-white/5"}`}>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Day</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Salary (₹)</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.paged.map(([date, entry]) => {
                const status    = getStatus(entry);
                const markedBy  = getMarkedBy(entry);
                const isToday   = date === getToday();
                const canEdit   = !readonly && (isSuperAdmin || isToday);
                const isPresent = status==="present"||status==="auto-present";
                return (
                  <tr key={date} className={`border-t border-white/5 transition-colors ${isPresent?"bg-green-500/[0.03]":"bg-red-500/[0.03]"} ${isToday?"ring-1 ring-inset ring-amber-400/20":""} ${isSuperAdmin&&!isToday?"hover:bg-red-500/[0.04]":""}`}>
                    <td className="px-5 py-3 text-sm font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-300">{fmtDate(date)}</span>
                        {isToday && <span className="text-[10px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">TODAY</span>}
                        {isSuperAdmin&&!isToday && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">🔓 ADMIN</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{new Date(date).toLocaleDateString("en-IN",{weekday:"short"})}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status==="present"?"bg-green-500/20 text-green-400":status==="auto-present"?"bg-blue-500/20 text-blue-400":"bg-red-500/20 text-red-400"}`}>
                          {statusLabel(status)}
                        </span>
                        {markedBy==="auto"&&!isToday && <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">auto</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {isPresent ? <span className="text-green-400">₹ {employee.perDaySalary.toLocaleString()}</span> : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {canEdit ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={()=>requestToggle(employee.id,date,"present")} className={`text-xs px-2.5 py-1 rounded-lg transition font-medium ${status==="present"?"bg-green-500/30 text-green-300 ring-1 ring-green-400/40":"bg-green-500/10 hover:bg-green-500/25 text-green-400 border border-green-500/20"}`}>✓ Present</button>
                          <button onClick={()=>requestToggle(employee.id,date,"absent")} className={`text-xs px-2.5 py-1 rounded-lg transition font-medium ${status==="absent"?"bg-red-500/30 text-red-300 ring-1 ring-red-400/40":"bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20"}`}>✗ Absent</button>
                        </div>
                      ) : <span className="text-xs text-gray-600">{readonly&&!isSuperAdmin?"—":"🔒 Locked"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <PaginationBar {...pagination} label="records" />

      {/* Past Date Confirmation Modal */}
      <AnimatePresence>
        {confirmPending && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setConfirmPending(null)} className="fixed inset-0 bg-black/75 backdrop-blur-md z-[70]" />
            <motion.div initial={{opacity:0,scale:0.88,y:24}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.88,y:24}} transition={{type:"spring",damping:22,stiffness:280}} className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div onClick={(e)=>e.stopPropagation()} className="bg-[#0f1117] border border-red-500/40 rounded-2xl p-7 w-full max-w-sm shadow-2xl shadow-red-500/10">
                <div className="flex items-center justify-center mb-5"><div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl">✏️</div></div>
                <h3 className="text-white font-bold text-lg text-center mb-1">Past Attendance Change?</h3>
                <p className="text-gray-400 text-sm text-center mb-5">Yeh action record mein permanent change karega</p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 space-y-3">
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Employee</span><span className="text-white font-semibold text-sm">{employee.name}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Date</span><span className="text-amber-400 font-mono font-bold text-sm">{fmtDate(confirmPending.date)}</span></div>
                  <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Change</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${confirmPending.currentStatus==="present"||confirmPending.currentStatus==="auto-present"?"bg-green-500/20 text-green-400":"bg-red-500/20 text-red-400"}`}>{statusLabel(confirmPending.currentStatus)}</span>
                      <span className="text-gray-500 text-xs">→</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ring-2 ${confirmPending.newStatus==="present"?"bg-green-500/25 text-green-300 ring-green-400/50":"bg-red-500/25 text-red-300 ring-red-400/50"}`}>{confirmPending.newStatus==="present"?"✓ Present":"✗ Absent"}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-5"><p className="text-amber-300/80 text-xs">⚠️ Salary calculation is change se affect hogi.</p></div>
                <div className="flex gap-3">
                  <button onClick={confirmChange} className={`flex-1 py-3 font-bold rounded-xl text-sm transition shadow-lg ${confirmPending.newStatus==="present"?"bg-green-600 hover:bg-green-500 text-white":"bg-red-600 hover:bg-red-500 text-white"}`}>
                    {confirmPending.newStatus==="present"?"✓ Haan, Present Karo":"✗ Haan, Absent Karo"}
                  </button>
                  <button onClick={()=>setConfirmPending(null)} className="flex-1 py-3 border border-white/15 text-gray-300 rounded-xl text-sm hover:bg-white/5 transition font-semibold">✕ Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Salary Detail Summary ───────────────────────────────────────── */
function SalaryDetailSummary({ employee, filterMonth, onUpdate, toast }) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount,    setPayAmount]    = useState("");
  const [payNote,      setPayNote]      = useState("");
  const [paying,       setPaying]       = useState(false);
  const [paySearch,    setPaySearch]    = useState("");
  const [dateFromPay,  setDateFromPay]  = useState("");
  const [dateToPay,    setDateToPay]    = useState("");

  const allEntries = Object.entries(employee.attendance || {}).filter(([date]) => filterMonth ? date.startsWith(filterMonth) : true);
  const presentDays = allEntries.filter(([,v])=>{const s=getStatus(v);return s==="present"||s==="auto-present";}).map(([date])=>date).sort((a,b)=>new Date(b)-new Date(a));
  const absentDays  = allEntries.filter(([,v])=>getStatus(v)==="absent").map(([date])=>date).sort((a,b)=>new Date(b)-new Date(a));

  const totalEarned  = presentDays.length * employee.perDaySalary;
  const totalPaid    = (employee.salaryPayments || []).reduce((s,p)=>s+(p.amount||0),0);
  const totalDue     = Math.max(0, totalEarned - totalPaid);
  const payAmountNum = Number(payAmount) || 0;

  // Payment history search
  const filteredPayments = useMemo(() => {
    let payments = [...(employee.salaryPayments||[])].reverse();
    if (paySearch) {
      const q = paySearch.toLowerCase();
      payments = payments.filter(p => p.note?.toLowerCase().includes(q) || String(p.amount).includes(q));
    }
    if (dateFromPay) payments = payments.filter(p => (p.paidOn||"") >= dateFromPay);
    if (dateToPay)   payments = payments.filter(p => (p.paidOn||"") <= dateToPay);
    return payments;
  }, [employee.salaryPayments, paySearch, dateFromPay, dateToPay]);

  const payPagination = usePagination(filteredPayments, 5);

  const handleMarkPaid = async () => {
    if (!payAmountNum||payAmountNum<=0) return toast("Amount enter karo","error");
    if (payAmountNum>totalDue) return toast(`Maximum ₹${totalDue.toLocaleString()} pay kar sakte ho`,"error");
    setPaying(true);
    try {
      await api.patch(`/employees/${employee.id}/salary/pay`, { amount:payAmountNum, note:payNote||`₹${payAmountNum.toLocaleString("en-IN")} payment` });
      const newPayment = { amount:payAmountNum, paidOn:getToday(), note:payNote||`₹${payAmountNum.toLocaleString("en-IN")} payment`, dates:[] };
      onUpdate({ ...employee, salaryPayments:[...(employee.salaryPayments||[]),newPayment] });
      setPayAmount(""); setPayNote(""); setShowPayModal(false);
      toast(`₹${payAmountNum.toLocaleString()} salary paid ho gaya! 💰`);
    } catch(err) { toast(err?.response?.data?.error||"Payment nahi hua","error"); }
    finally { setPaying(false); }
  };

  return (
    <div className="p-5 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-gray-400 mb-1">💼 Total Earned</p>
          <p className="text-2xl font-black text-green-400">₹ {totalEarned.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">{presentDays.length} din × ₹{employee.perDaySalary}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-gray-400 mb-1">✅ Total Paid</p>
          <p className="text-2xl font-black text-blue-400">₹ {totalPaid.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">{(employee.salaryPayments||[]).length} payments</p>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${totalDue>0?"bg-orange-500/10 border-orange-500/30":"bg-white/5 border-white/10"}`}>
          <p className="text-[11px] text-gray-400 mb-1">⏳ Total Due</p>
          <p className={`text-2xl font-black ${totalDue>0?"text-orange-400":"text-gray-500"}`}>₹ {totalDue.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-1">{totalDue>0?"Remaining baaki hai":"Fully paid ✓"}</p>
        </div>
      </div>

      {/* Due Alert */}
      {totalDue>0 ? (
        <div className="bg-orange-500/8 border border-orange-500/30 rounded-2xl px-5 py-4">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div>
              <p className="text-xs text-gray-400">Outstanding Due</p>
              <p className="text-3xl font-black text-orange-400">₹ {totalDue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total earned ₹{totalEarned.toLocaleString()} − paid ₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={()=>{setPayAmount("");setShowPayModal(true);}} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition border border-white/15">💰 Custom Amount</button>
              <button onClick={()=>{setPayAmount(String(totalDue));setShowPayModal(true);}} className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-orange-500/20">💳 Pay Full (₹{totalDue.toLocaleString()})</button>
            </div>
          </div>
          {totalEarned>0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-blue-400">Paid: {Math.round((totalPaid/totalEarned)*100)}%</span>
                <span className="text-orange-400">Due: {Math.round((totalDue/totalEarned)*100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-400 h-2 rounded-full transition-all duration-500" style={{width:`${Math.min(100,(totalPaid/totalEarned)*100)}%`}} />
              </div>
            </div>
          )}
        </div>
      ) : presentDays.length>0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div><p className="text-green-400 font-semibold text-sm">Poora salary paid ho gaya!</p><p className="text-xs text-gray-500">Koi bhi salary due nahi hai.</p></div>
        </div>
      )}

      {/* Days */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {presentDays.length>0 && (
          <div>
            <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Present Days ({presentDays.length})</h4>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {presentDays.map((date)=>(
                <div key={date} className="flex justify-between items-center bg-green-500/8 border border-green-500/15 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2"><span className="text-green-400 text-xs">✓</span><span className="text-sm text-gray-200">{fmtDate(date)}</span><span className="text-xs text-gray-500">{new Date(date).toLocaleDateString("en-IN",{weekday:"short"})}</span></div>
                  <span className="text-green-400 text-xs font-semibold">₹{employee.perDaySalary}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {absentDays.length>0 && (
          <div>
            <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Absent Days ({absentDays.length})</h4>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {absentDays.map((date)=>(
                <div key={date} className="flex justify-between items-center bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2"><span className="text-red-400 text-xs">✗</span><span className="text-sm text-gray-400">{fmtDate(date)}</span><span className="text-xs text-gray-500">{new Date(date).toLocaleDateString("en-IN",{weekday:"short"})}</span></div>
                  <span className="text-gray-600 text-xs">—</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment History with search + pagination */}
      {(employee.salaryPayments||[]).length>0 && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-gray-300 font-semibold flex items-center gap-2">
              📋 Payment History <span className="text-xs text-gray-500 font-normal">({(employee.salaryPayments||[]).length} transactions)</span>
            </h4>
          </div>

          {/* Payment search + date filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <SearchBar value={paySearch} onChange={setPaySearch} placeholder="Search by note or amount..." className="flex-1 min-w-[160px]" />
            <input type="date" value={dateFromPay} onChange={e=>setDateFromPay(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-400" />
            <input type="date" value={dateToPay} onChange={e=>setDateToPay(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-amber-400" />
            {(paySearch||dateFromPay||dateToPay) && (
              <button onClick={()=>{setPaySearch("");setDateFromPay("");setDateToPay("");}} className="text-xs text-red-400 hover:text-red-300 px-2">✕ Clear</button>
            )}
          </div>

          {payPagination.paged.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">Koi payment nahi mila</div>
          ) : (
            <div className="space-y-2">
              {(()=>{
                let runningPaid=0;
                const totalPayments = [...(employee.salaryPayments||[])].reverse();
                return payPagination.paged.map((pay,i)=>{
                  runningPaid += pay.amount||0;
                  const remaining = Math.max(0, totalEarned - runningPaid);
                  return (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-bold text-base">₹ {(pay.amount||0).toLocaleString()}</p>
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">Paid ✓</span>
                          </div>
                          {pay.note && <p className="text-xs text-gray-400 mt-0.5">
                            {paySearch ? <HighlightText text={pay.note} query={paySearch} /> : pay.note}
                          </p>}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xs text-gray-300 font-mono">{fmtDate(pay.paidOn)}</p>
                          <p className="text-[11px] text-gray-600 mt-1">Due left: <span className="text-orange-400">₹{remaining.toLocaleString()}</span></p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Payment history pagination */}
          {payPagination.totalPages > 1 && (
            <div className="mt-2 bg-white/5 rounded-xl overflow-hidden">
              <PaginationBar {...payPagination} label="payments" />
            </div>
          )}
        </div>
      )}

      {/* Pay Modal */}
      <AnimatePresence>
        {showPayModal && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowPayModal(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
            <motion.div initial={{opacity:0,scale:0.9,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:20}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e)=>e.stopPropagation()} className="bg-[#1a1d27] border border-orange-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-white font-bold text-lg mb-1">💳 Salary Payment</h3>
                <p className="text-gray-400 text-sm mb-5">{employee.name} — Total Due: <span className="text-orange-400 font-bold">₹{totalDue.toLocaleString()}</span></p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-300">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₹</span>
                    <input type="text" inputMode="decimal" value={payAmount} onChange={(e)=>setPayAmount(e.target.value)}
                      placeholder={`Max: ${totalDue}`}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-white text-lg font-bold placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" autoFocus />
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[100,200,500].filter(v=>v<=totalDue).map(v=>(
                      <button key={v} onClick={()=>setPayAmount(String(v))} className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-gray-300 transition">₹{v}</button>
                    ))}
                    <button onClick={()=>setPayAmount(String(totalDue))} className="text-xs px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 rounded-lg text-orange-300 transition ml-auto">Full ₹{totalDue.toLocaleString()}</button>
                  </div>
                </div>
                {payAmountNum>0 && (
                  <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
                    className={`rounded-xl px-4 py-3 mb-4 border ${payAmountNum>totalDue?"bg-red-500/10 border-red-500/30":"bg-orange-500/10 border-orange-500/20"}`}>
                    {payAmountNum>totalDue ? (
                      <p className="text-red-400 text-sm font-semibold">⚠️ Amount due (₹{totalDue.toLocaleString()}) se zyada hai</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Pay karoge:</span><span className="text-white font-bold">₹ {payAmountNum.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Baad mein due:</span><span className={`font-bold ${totalDue-payAmountNum>0?"text-orange-400":"text-green-400"}`}>₹ {(totalDue-payAmountNum).toLocaleString()}</span></div>
                        {totalDue-payAmountNum===0 && <p className="text-green-400 text-xs font-semibold">🎉 Poora clear ho jayega!</p>}
                      </div>
                    )}
                  </motion.div>
                )}
                <div className="mb-5">
                  <label className="block text-sm font-medium mb-1 text-gray-300">Note (optional)</label>
                  <input value={payNote} onChange={(e)=>setPayNote(e.target.value)} placeholder="e.g. September advance..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleMarkPaid} disabled={paying||!payAmountNum||payAmountNum<=0||payAmountNum>totalDue}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {paying?"Processing...":`✓ Pay ₹${payAmountNum?payAmountNum.toLocaleString():"—"}`}
                  </button>
                  <button onClick={()=>setShowPayModal(false)} className="flex-1 py-2.5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/5 transition">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Employee Detail Drawer ──────────────────────────────────────── */
function EmployeeDetailDrawer({ employee, onClose, onUpdate, onToggleActive, toast }) {
  const [tab,  setTab]  = useState("profile");
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState({ name:employee.name, phone:employee.phone, address:employee.address });
  const [showIncrementForm, setShowIncrementForm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [incForm, setIncForm]     = useState({ newSalary:"", reason:"", effectiveDate:getToday() });
  const [savingProfile, setSavingProfile]     = useState(false);
  const [savingIncrement, setSavingIncrement] = useState(false);
  const [refreshing, setRefreshing]           = useState(false);
  const [paymentSummary, setPaymentSummary]   = useState(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResult, setResetResult]         = useState(null);
  const stats = getEmpStats(employee);

  const refreshEmployee = async () => {
    setRefreshing(true);
    try { const {data}=await api.get(`/employees/${employee.id}`); onUpdate(data.data); toast("Data refresh ho gaya ✅"); }
    catch(err) { toast(err?.response?.data?.error||"Refresh nahi hua","error"); }
    finally { setRefreshing(false); }
  };

  const fetchPaymentSummary = async () => {
    setLoadingPayments(true);
    try { const {data}=await api.get(`/employees/${employee.id}/salary/pay`); setPaymentSummary(data.data); }
    catch(err) { toast(err?.response?.data?.error||"Payment summary load nahi hua","error"); }
    finally { setLoadingPayments(false); }
  };

  useEffect(() => { if (tab==="salary") fetchPaymentSummary(); }, [tab]); // eslint-disable-line

  const saveProfile = async () => {
    setSavingProfile(true);
    try { const {data}=await api.patch(`/employees/${employee.id}`,{name:form.name,phone:form.phone,address:form.address}); onUpdate({...employee,...data.data}); setEditMode(false); toast("Profile update ho gaya ✅"); }
    catch(err) { toast(err?.response?.data?.error||"Profile save nahi hua","error"); }
    finally { setSavingProfile(false); }
  };

  const saveIncrement = async () => {
    if (!incForm.newSalary||!incForm.effectiveDate) return toast("Salary aur Date required hai","error");
    setSavingIncrement(true);
    try {
      const {data}=await api.patch(`/employees/${employee.id}/salary`,{newSalary:Number(incForm.newSalary),effectiveDate:incForm.effectiveDate,reason:incForm.reason||"Salary Update"});
      onUpdate({...employee,perDaySalary:Number(incForm.newSalary),salaryHistory:data.data.salaryHistory});
      setIncForm({newSalary:"",reason:"",effectiveDate:getToday()}); setShowIncrementForm(false); toast(data.message);
    } catch(err) { toast(err?.response?.data?.error||"Salary update nahi hua","error"); }
    finally { setSavingIncrement(false); }
  };

  const handleResetPassword = async () => {
    setResettingPassword(true);
    try {
      const { data } = await api.patch(`/employees/${employee.id}/reset-password`, {});
      if (data.success) {
        setResetResult(data.data);
        setShowResetConfirm(false);
        toast(`${employee.name} ka password reset ho gaya!`);
      }
    } catch (err) {
      toast(err?.response?.data?.error || "Password reset nahi hua", "error");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:30,stiffness:300}}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#13151f] border-l border-white/10 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 sticky top-0 bg-[#13151f] z-10">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{employee.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${employee.isActive?"bg-green-500/20 text-green-400":"bg-gray-700 text-gray-400"}`}>{employee.isActive?"● Active":"○ Inactive"}</span>
            </div>
            <p className="text-xs text-amber-400 font-mono">{employee.empId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshEmployee} disabled={refreshing} className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-500/20 border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-300 transition disabled:opacity-50">
              <span className={`text-sm ${refreshing?"animate-spin":""}`}>🔄</span>
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition">✕</button>
          </div>
        </div>
        <div className="flex border-b border-white/10">
          {["profile","salary"].map((t)=>(
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 text-sm font-semibold capitalize transition ${tab===t?"text-amber-400 border-b-2 border-amber-400":"text-gray-400 hover:text-white"}`}>
              {t==="profile"?"👤 Profile":"💰 Salary History"}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab==="profile" && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl font-black text-black">{employee.name.charAt(0)}</div>
                <div><p className="text-xl font-bold text-white">{employee.name}</p><p className="text-xs text-gray-400">Joined: {fmtDate(employee.joiningDate)}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{label:"Present",value:stats.present,color:"text-green-400"},{label:"Absent",value:stats.absent,color:"text-red-400"},{label:"Earned",value:`₹${(stats.totalEarned/1000).toFixed(1)}k`,color:"text-amber-400"}].map((s)=>(
                  <div key={s.label} className="bg-white/5 rounded-xl py-3"><p className={`font-bold text-lg ${s.color}`}>{s.value}</p><p className="text-[11px] text-gray-500">{s.label}</p></div>
                ))}
              </div>
              {!editMode ? (
                <div className="space-y-3">
                  {[{label:"Employee ID",value:employee.empId},{label:"Phone",value:employee.phone},{label:"Address",value:employee.address||"—"},{label:"Per Day Salary",value:`₹ ${employee.perDaySalary.toLocaleString()}`},{label:"Joining Date",value:fmtDate(employee.joiningDate)}].map((f)=>(
                    <div key={f.label} className="flex justify-between items-start bg-white/5 rounded-xl px-4 py-3 gap-3"><span className="text-gray-400 text-sm shrink-0">{f.label}</span><span className="text-white text-sm text-right font-medium">{f.value}</span></div>
                  ))}
                  <button onClick={()=>setEditMode(true)} className="w-full mt-2 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-sm font-semibold transition">✏️ Edit Profile</button>
                  <button onClick={()=>setShowResetConfirm(true)} className="w-full py-2.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/30 text-orange-300 text-sm font-semibold transition border border-orange-500/25">🔑 Password Reset Karo</button>
                  <button onClick={()=>setShowToggleConfirm(true)} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition border ${employee.isActive?"bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-900/40":"bg-green-500/20 hover:bg-green-500/40 text-green-400 border-green-500/30"}`}>
                    {employee.isActive?"🚫 Deactivate Employee":"✅ Reactivate Employee"}
                  </button>

                  <AnimatePresence>
                    {showResetConfirm && (
                      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} className="rounded-2xl border border-orange-500/30 bg-orange-950/30 p-4 space-y-3">
                        <p className="text-sm text-white font-semibold">🔑 Password Reset Karna Chahte Ho?</p>
                        <p className="text-xs text-gray-400">Password auto-generate hoga:<br/><span className="text-orange-300 font-mono font-bold">{employee.name?.trim().replace(/\s+/g,"").substring(0,3).toUpperCase()}{String(employee.phone).replace(/\D/g,"").slice(-4)}</span><span className="text-gray-500"> (Name first 3 + Phone last 4)</span></p>
                        <div className="flex gap-2">
                          <button onClick={handleResetPassword} disabled={resettingPassword} className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition disabled:opacity-50">{resettingPassword ? "Resetting..." : "Haan, Reset Karo"}</button>
                          <button onClick={()=>setShowResetConfirm(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition">Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {resetResult && (
                      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="rounded-2xl border border-green-500/30 bg-green-950/20 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-green-400 font-bold text-sm">✅ Password Reset Ho Gaya!</p>
                          <button onClick={()=>setResetResult(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
                        </div>
                        <p className="text-[11px] text-gray-400">Employee ko yeh credentials do:</p>
                        <div className="bg-black/30 rounded-xl px-4 py-3 space-y-1">
                          <div className="flex justify-between text-xs"><span className="text-gray-400">Phone</span><span className="text-white font-mono">{resetResult.phone}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-400">Naya Password</span><span className="text-green-300 font-mono font-bold text-base tracking-wider">{resetResult.newPassword}</span></div>
                        </div>
                        <p className="text-[10px] text-red-400">⚠️ Yeh dobara nahi dikhega — abhi note kar lo</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showToggleConfirm && (
                      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} className={`rounded-2xl border p-4 space-y-3 ${employee.isActive?"bg-red-950/40 border-red-500/30":"bg-green-950/40 border-green-500/30"}`}>
                        <p className="text-sm text-white font-semibold">{employee.isActive?"⚠️ Deactivate Karna Chahte Ho?":"✅ Reactivate Karna Chahte Ho?"}</p>
                        <p className="text-xs text-gray-400">{employee.isActive?"Employee inactive ho jayega.":"Employee dobara active ho jayega."}</p>
                        <div className="flex gap-2">
                          <button onClick={()=>{onToggleActive();setShowToggleConfirm(false);}} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${employee.isActive?"bg-red-600 hover:bg-red-500 text-white":"bg-green-600 hover:bg-green-500 text-white"}`}>
                            {employee.isActive?"Haan, Deactivate Karo":"Haan, Reactivate Karo"}
                          </button>
                          <button onClick={()=>setShowToggleConfirm(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition">Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input label="Name"    value={form.name}    onChange={(e)=>setForm(p=>({...p,name:e.target.value}))} />
                  <Input label="Phone"   value={form.phone}   onChange={(e)=>setForm(p=>({...p,phone:e.target.value}))} />
                  <Input label="Address" value={form.address} onChange={(e)=>setForm(p=>({...p,address:e.target.value}))} />
                  <div className="flex gap-3 pt-1">
                    <button onClick={saveProfile} disabled={savingProfile} className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition disabled:opacity-50">{savingProfile?"Saving...":"Save"}</button>
                    <button onClick={()=>setEditMode(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab==="salary" && (
            <div className="space-y-4">
              {loadingPayments ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse text-center text-gray-500 text-sm">Loading payment summary...</div>
              ) : paymentSummary ? (
                <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">📊 Live Salary Summary</p>
                    <button onClick={fetchPaymentSummary} className="text-[10px] text-blue-400 hover:text-blue-300 underline">Refresh</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-500/10 rounded-xl py-2 px-1"><p className="text-green-400 font-black text-lg">₹{(paymentSummary.summary.totalEarned||0).toLocaleString()}</p><p className="text-[10px] text-gray-500">Earned</p><p className="text-[10px] text-gray-600">{paymentSummary.summary.presentDays} din</p></div>
                    <div className="bg-blue-500/10 rounded-xl py-2 px-1"><p className="text-blue-400 font-black text-lg">₹{(paymentSummary.summary.totalPaid||0).toLocaleString()}</p><p className="text-[10px] text-gray-500">Paid ✓</p><p className="text-[10px] text-gray-600">{paymentSummary.payments?.length||0} txns</p></div>
                    <div className={`rounded-xl py-2 px-1 ${paymentSummary.summary.totalDue>0?"bg-orange-500/10":"bg-white/5"}`}><p className={`font-black text-lg ${paymentSummary.summary.totalDue>0?"text-orange-400":"text-gray-500"}`}>₹{(paymentSummary.summary.totalDue||0).toLocaleString()}</p><p className="text-[10px] text-gray-500">Due ⏳</p><p className="text-[10px] text-gray-600">{paymentSummary.summary.absentDays} absent</p></div>
                  </div>
                </div>
              ) : null}
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4 flex justify-between items-center">
                <div><p className="text-gray-400 text-xs">Current Per Day Salary</p><p className="text-3xl font-black text-amber-400">₹ {employee.perDaySalary.toLocaleString()}</p></div>
                {employee.isActive && <button onClick={()=>setShowIncrementForm(p=>!p)} className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm rounded-xl transition">{showIncrementForm?"✕ Cancel":"↑ Update Salary"}</button>}
              </div>
              <AnimatePresence>
                {showIncrementForm && (
                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="overflow-hidden">
                    <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-white">Update Salary</p>
                      <Input label="New Per Day Salary (₹)" type="text" inputMode="decimal" placeholder={`Current: ₹${employee.perDaySalary}`} value={incForm.newSalary} onChange={(e)=>setIncForm(p=>({...p,newSalary:e.target.value}))} />
                      <Input label="Effective Date" type="date" value={incForm.effectiveDate} onChange={(e)=>setIncForm(p=>({...p,effectiveDate:e.target.value}))} />
                      <Input label="Reason (optional)" placeholder="e.g. Annual Increment" value={incForm.reason} onChange={(e)=>setIncForm(p=>({...p,reason:e.target.value}))} />
                      {incForm.newSalary && <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2 text-sm"><span className="text-gray-400">Change: </span><span className="text-white font-semibold">₹{employee.perDaySalary} → </span><span className="text-green-400 font-bold">₹{incForm.newSalary}</span></div>}
                      <button onClick={saveIncrement} disabled={savingIncrement} className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50">{savingIncrement?"Saving...":"✓ Save Salary Update"}</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-3">Salary History</p>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-white/10" />
                  <div className="space-y-3">
                    {[...(employee.salaryHistory||[])].reverse().map((h,i)=>(
                      <div key={i} className="relative flex items-start gap-4 pl-8">
                        <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${i===0?"bg-amber-400 text-black":"bg-white/10 text-gray-400"}`}>{i===0?"★":"↑"}</div>
                        <div className={`flex-1 rounded-xl p-3 border ${i===0?"bg-amber-400/5 border-amber-400/20":"bg-white/5 border-white/5"}`}>
                          <div className="flex justify-between items-start">
                            <p className={`font-bold text-lg ${i===0?"text-amber-400":"text-white"}`}>₹ {h.salary.toLocaleString()}<span className="text-xs font-normal text-gray-400 ml-1">/day</span></p>
                            {i===0 && <span className="text-[10px] bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">CURRENT</span>}
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

/* ── Add Expense Form ────────────────────────────────────────────── */
function AddExpenseForm({ type, onClose, onSave, employeeCount }) {
  const [form, setForm] = useState({ date:getToday(), unit:"pcs" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const autoAmount = form.qty && form.rate ? (Number(form.qty)*Number(form.rate)).toFixed(2) : "";
  const empIdPreview = form.name && form.phone ? (()=>{
    const namePart  = form.name.trim().replace(/\s+/g,"").substring(0,3).toUpperCase();
    const phonePart = String(form.phone).replace(/\D/g,"").slice(-4);
    const seq       = String(employeeCount+1).padStart(3,"0");
    return `${namePart}-${phonePart}-${seq}`;
  })() : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (type==="salary") {
        if (!form.name||!form.phone||!form.perDaySalary) return alert("Name, Phone aur Per Day Salary required hai");
        await onSave({ name:form.name, phone:form.phone, address:form.address||"", joiningDate:form.joiningDate||getToday(), perDaySalary:Number(form.perDaySalary) });
      } else {
        if (!form.category||!form.desc||!form.date) return alert("Category, Item name aur Date required hai");
        const finalAmount = autoAmount||form.amount;
        if (!finalAmount||Number(finalAmount)<=0) return alert("Amount ya Qty × Rate required hai");
        await onSave({ category:form.category, desc:form.desc, qty:form.qty?Number(form.qty):1, unit:form.unit||"pcs", rate:form.rate?Number(form.rate):0, amount:Number(finalAmount), date:form.date });
      }
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-5 text-white">{type==="salary"?"👤 New Employee Register":"🧾 Add Expense"}</h2>
      {type==="goods" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date *" type="date" value={form.date} onChange={(e)=>set("date",e.target.value)} />
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium mb-1 text-gray-300">Category *</label>
              <select value={form.category||""} onChange={(e)=>set("category",e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="" className="bg-[#1a1d27]">Select category</option>
                {EXPENSE_CATEGORIES.map((c)=><option key={c} value={c} className="bg-[#1a1d27]">{c}</option>)}
              </select>
            </div>
          </div>
          <Input label="Item Name / Description *" placeholder="e.g. Welding Rod, Diesel..." value={form.desc||""} onChange={(e)=>set("desc",e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Quantity" type="text" inputMode="decimal" placeholder="e.g. 5" value={form.qty||""} onChange={(e)=>set("qty",e.target.value)} />
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium mb-1 text-gray-300">Unit</label>
              <select value={form.unit} onChange={(e)=>set("unit",e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                {["pcs","kg","ltr","box","set","pair","mtr","rft","bag"].map((u)=><option key={u} value={u} className="bg-[#1a1d27]">{u}</option>)}
              </select>
            </div>
            <Input label="Rate (₹)" type="text" inputMode="decimal" placeholder="e.g. 120" value={form.rate||""} onChange={(e)=>set("rate",e.target.value)} />
          </div>
          {autoAmount ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
              <div><p className="text-xs text-gray-400">Auto Calculated Amount</p><p className="text-xs text-gray-500">{form.qty} {form.unit} × ₹{form.rate}</p></div>
              <p className="text-xl font-black text-green-400">₹ {Number(autoAmount).toLocaleString()}</p>
            </div>
          ) : (
            <Input label="Amount (₹) *" type="text" inputMode="decimal" placeholder="Direct amount dalo agar qty/rate nahi pata" value={form.amount||""} onChange={(e)=>set("amount",e.target.value)} />
          )}
        </div>
      )}
      {type==="salary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name *" placeholder="Ramesh Kumar" onChange={(e)=>set("name",e.target.value)} />
            <Input label="Phone Number *" type="tel" placeholder="98XXXXXXXX" onChange={(e)=>set("phone",e.target.value)} />
          </div>
          <Input label="Address" placeholder="Ghar ka pata" onChange={(e)=>set("address",e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Per Day Salary (₹) *" type="text" inputMode="decimal" placeholder="e.g. 600" onChange={(e)=>set("perDaySalary",e.target.value)} />
            <Input label="Joining Date" type="date" onChange={(e)=>set("joiningDate",e.target.value)} />
          </div>
          {empIdPreview && <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5"><p className="text-xs text-gray-400">Auto-generated Employee ID preview:</p><p className="text-blue-300 font-mono font-bold text-sm mt-0.5">{empIdPreview}</p></div>}
          <p className="text-xs text-gray-500 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">💡 Salary = <strong className="text-amber-400">Present Days × Per Day Salary</strong></p>
        </div>
      )}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={handleSave} disabled={saving} className="bg-amber-400 text-black font-semibold px-5 py-2 rounded-lg hover:bg-amber-300 transition disabled:opacity-50">{saving?"Saving...":"Save"}</button>
        <button onClick={onClose} className="border border-white/10 text-gray-300 px-5 py-2 rounded-lg hover:bg-white/5 transition">Cancel</button>
      </div>
    </div>
  );
}

/* ── Input component ─────────────────────────────────────────────── */
function Input({ label, ...props }) {
  return (
    <div className="flex-1 min-w-0">
      {label && <label className="block text-sm font-medium mb-1 text-gray-300">{label}</label>}
      <input {...props} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed" />
    </div>
  );
}