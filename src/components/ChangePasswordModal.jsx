"use client";
// src/components/ChangePasswordModal.jsx
//
// ✅ NEW: Employee apna password change kar sakta hai
// - Current password verify hota hai pehle
// - New password + Confirm password
// - Strength indicator
// - Success pe auto close

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import axios                           from "axios";

// ─── Password Strength ────────────────────────────────────────────
const getStrength = (pw) => {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6)                    score++;
  if (pw.length >= 8)                    score++;
  if (/[A-Z]/.test(pw))                  score++;
  if (/[0-9]/.test(pw))                  score++;
  if (/[^A-Za-z0-9]/.test(pw))          score++;

  if (score <= 1) return { level: 1, label: "Kamzor",   color: "#ef4444" };
  if (score <= 2) return { level: 2, label: "Theek Hai",color: "#f59e0b" };
  if (score <= 3) return { level: 3, label: "Accha",    color: "#10b981" };
  return           { level: 4, label: "Bahut Accha",    color: "#3b82f6" };
};

// ─── Input Field ──────────────────────────────────────────────────
function PwInput({ label, value, onChange, placeholder, show, onToggle, autoFocus }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-[#06080f] border border-[#1e2235] focus:border-blue-500/60
                     focus:ring-2 focus:ring-blue-500/12 rounded-xl px-4 py-3 pr-11
                     text-white placeholder-[#2e3248] outline-none transition-all text-sm"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500
                     hover:text-gray-300 transition text-base"
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────
export default function ChangePasswordModal({ empToken, onClose }) {
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showCon,    setShowCon]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  const strength = getStrength(newPw);
  const match    = newPw && confirmPw && newPw === confirmPw;
  const noMatch  = confirmPw && newPw !== confirmPw;

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSubmit = async () => {
    setError("");

    // Validations
    if (!currentPw || !newPw || !confirmPw) {
      setError("Teeno fields required hain"); return;
    }
    if (newPw.length < 6) {
      setError("Naya password kam se kam 6 characters ka hona chahiye"); return;
    }
    if (newPw !== confirmPw) {
      setError("Naya password aur confirm password match nahi kar rahe"); return;
    }
    if (newPw === currentPw) {
      setError("Naya password purane password se alag hona chahiye"); return;
    }

    setLoading(true);
    try {
      const { data } = await axios.patch(
        "/api/employees/me/change-password",
        { currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw },
        { headers: { Authorization: `Bearer ${empToken}` } }
      );

      if (data.success) {
        setSuccess(true);
        // 2.5 sec baad close karo
        setTimeout(() => onClose(), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Kuch galat hua — dobara try karo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="bg-[#0d0f1e] border border-white/10 rounded-2xl w-full max-w-sm
                     shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25
                              flex items-center justify-center text-lg">🔑</div>
              <div>
                <p className="text-white font-bold text-sm">Password Change Karo</p>
                <p className="text-[11px] text-gray-500">Apna naya password set karo</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10
                         flex items-center justify-center text-gray-400 hover:text-white transition">
              ✕
            </button>
          </div>

          {/* Success State */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30
                             flex items-center justify-center text-3xl mb-4"
                >
                  ✅
                </motion.div>
                <p className="text-white font-bold text-lg mb-1">Password Change Ho Gaya!</p>
                <p className="text-gray-400 text-sm">
                  Agli baar naye password se login karo
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          {!success && (
            <div className="p-6 space-y-4">

              {/* Current Password */}
              <PwInput
                label="Current Password *"
                value={currentPw}
                onChange={e => { setCurrentPw(e.target.value); setError(""); }}
                placeholder="Apna abhi wala password"
                show={showCur}
                onToggle={() => setShowCur(p => !p)}
                autoFocus
              />

              {/* New Password */}
              <div>
                <PwInput
                  label="Naya Password *"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setError(""); }}
                  placeholder="Kam se kam 6 characters"
                  show={showNew}
                  onToggle={() => setShowNew(p => !p)}
                />

                {/* Strength Bar */}
                {newPw && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{
                            background: i <= strength.level ? strength.color : "#1e2235"
                          }} />
                      ))}
                    </div>
                    <p className="text-[10px]" style={{ color: strength.color }}>
                      {strength.label}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <PwInput
                  label="Confirm Password *"
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                  placeholder="Dobara same password likho"
                  show={showCon}
                  onToggle={() => setShowCon(p => !p)}
                />
                {/* Match indicator */}
                <AnimatePresence>
                  {match && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-green-400 text-[10px] mt-1.5">
                      ✓ Password match kar raha hai
                    </motion.p>
                  )}
                  {noMatch && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-red-400 text-[10px] mt-1.5">
                      ✗ Password match nahi kar raha
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm">⚠️ {error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hint */}
              <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl px-4 py-2.5">
                <p className="text-blue-400/70 text-[11px]">
                  💡 Strong password ke liye — letters, numbers aur special characters use karo
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={loading || !currentPw || !newPw || !confirmPw || noMatch}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition
                             disabled:opacity-40 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                           boxShadow: "0 4px 20px rgba(59,130,246,0.25)" }}
                >
                  {loading ? (
                    <>
                      <motion.div animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Saving...
                    </>
                  ) : (
                    "🔑 Password Change Karo"
                  )}
                </motion.button>
                <button onClick={onClose}
                  className="px-4 py-3 rounded-xl border border-white/10 text-gray-400
                             hover:bg-white/5 hover:text-white transition text-sm font-semibold">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}