"use client";
// src/app/login/page.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

// ─── Animated grid background ─────────────────────────────────────
function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.18, 0.1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, #f59e0b44 0%, transparent 70%)" }}
      />
      {[
        { x: "8%", y: "15%", size: 200, dur: 9 },
        { x: "82%", y: "65%", size: 240, dur: 12 },
        { x: "55%", y: "8%", size: 160, dur: 8 },
      ].map((o, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -28, 0], x: [0, 14, 0] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut", delay: i * 2.5 }}
          className="absolute rounded-full blur-3xl bg-amber-500/6"
          style={{ left: o.x, top: o.y, width: o.size, height: o.size }}
        />
      ))}
    </div>
  );
}

// ─── 3D Tilt card ─────────────────────────────────────────────────
function TiltCard({ children }) {
  const ref = useRef(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setRot({
      x: ((e.clientY - r.top) / r.height - 0.5) * -5,
      y: ((e.clientX - r.left) / r.width - 0.5) * 5,
    });
  };
  const onLeave = () => setRot({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={{ rotateX: rot.x, rotateY: rot.y }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { admin, login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (admin) router.replace("/dashboard");
  }, [admin, router]);

  // ─── ✅ FIX BUG 7: Clean login logic ──────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ─── 1. Try Admin Login ─────────────────────────────
      try {
        const { data } = await axios.post("/api/admin/login", { phone, password });

        if (data?.success && data?.data?.token) {
          const { token, admin: a } = data.data;

          login({
            token,
            role: a.role,
            name: a.name,
            email: a.email,
            phone: a.phone,
          });

          router.push("/dashboard");
          return;
        }
      } catch (adminErr) {
        const status = adminErr?.response?.status;
        const errorMsg = adminErr?.response?.data?.error;

        // ❌ Wrong credentials (Admin exists but wrong password)
        if (status === 401) {
          setError("Phone ya password galat hai");
          setShakeKey((k) => k + 1);
          return;
        }

        // ❌ Access denied / role issue
        if (status === 403) {
          setError(errorMsg || "Access denied — admin se baat karo");
          setShakeKey((k) => k + 1);
          return;
        }

        // ❌ Admin not found → try employee
        if (status !== 404) {
          throw adminErr;
        }
      }

      // ─── 2. Try Employee Login ───────────────────────────
      try {
        const { data } = await axios.post("/api/employees/auth/login", {
          phone,
          password,
        });

        if (data?.success && data?.data?.token) {
          const { token, employee } = data.data;

          localStorage.setItem("emp_token", token);
          localStorage.setItem("emp_name", employee.name);
          localStorage.setItem("emp_id", String(employee._id));
          localStorage.setItem("emp_empId", employee.empId);

          router.push("/employee/dashboard");
          return;
        }
      } catch (empErr) {
        const status = empErr?.response?.status;
        const code = empErr?.response?.data?.code;
        const errorMsg = empErr?.response?.data?.error;

        // ❌ Deactivated account
        if (status === 403 && code === "ACCOUNT_DEACTIVATED") {
          setError("Aapka account deactivate hai — admin se baat karo");
          setShakeKey((k) => k + 1);
          return;
        }

        // ❌ Employee not found OR wrong password
        if (status === 401 || status === 404) {
          setError("Phone ya password galat hai");
          setShakeKey((k) => k + 1);
          return;
        }

        // ❌ Other server error
        throw empErr;
      }

      // ❌ Final fallback (should rarely happen)
      setError("Login failed — dobara try karo");
      setShakeKey((k) => k + 1);

    } catch (err) {
      // ✅ FIX 30: Dev-only guard — production mein console.error nahi dikhega
      if (process.env.NODE_ENV === "development") {
        console.error("Login error:", err);
      }

      // 🌐 Network / server issue
      if (!err.response) {
        setError("Internet ya server issue — dobara try karo");
      } else {
        setError("Server error — thodi der baad try karo");
      }

      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0c14] flex items-center justify-center px-4 py-8"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <GridBackground />

      <div className="w-full max-w-sm relative z-10">

        {/* ── Logo ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <div className="relative w-16 h-16 mx-auto mb-5">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-amber-500/25 rounded-[40%_60%_60%_40%_/_40%_40%_60%_60%]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-1.5 border border-amber-500/15 rounded-[60%_40%_40%_60%_/_60%_60%_40%_40%]"
            />
            <div className="absolute inset-0 flex items-center justify-center text-[26px]">⚙️</div>
          </div>
          <h1
            className="text-3xl font-black text-white tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            FabriCore
          </h1>
          <p className="text-[#45506e] text-sm mt-1.5">
            Apne account mein login karo
          </p>
        </motion.div>

        {/* ── Card ──────────────────────────────────────────────── */}
        <TiltCard>
          <motion.div
            key={shakeKey}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={
              shakeKey > 0
                ? { x: [-10, 10, -7, 7, -3, 3, 0], opacity: 1, y: 0, scale: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={{
              delay: shakeKey > 0 ? 0 : 0.2,
              duration: shakeKey > 0 ? 0.45 : 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative bg-[#0d0f1e]/95 border border-white/[0.07] rounded-3xl p-7 overflow-hidden backdrop-blur-2xl shadow-2xl shadow-black/60"
          >
            {/* Inner highlights */}
            <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <form onSubmit={handleLogin} className="relative space-y-5">

              {/* Error toast */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3 flex items-center gap-2.5 mb-1">
                      <span className="text-red-400 text-sm flex-shrink-0">⚠</span>
                      <span className="text-red-400 text-sm">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phone */}
              <motion.div
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.38, duration: 0.45 }}
              >
                <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#3d4870] mb-2.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="w-full bg-[#080a13] border border-[#1a1e30] hover:border-[#272c42] focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/15 rounded-2xl px-4 py-4 text-white text-[15px] placeholder-[#272c42] outline-none transition-all duration-200"
                />
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.48, duration: 0.45 }}
              >
                <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#3d4870] mb-2.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#080a13] border border-[#1a1e30] hover:border-[#272c42] focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/15 rounded-2xl px-4 py-4 pr-12 text-white text-[15px] placeholder-[#272c42] outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#303654] hover:text-amber-400 transition-colors duration-150"
                  >
                    {showPw ? (
                      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58, duration: 0.4 }}
                className="pt-1"
              >
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.015 }}
                  whileTap={{ scale: loading ? 1 : 0.975 }}
                  className="relative w-full h-[52px] rounded-2xl font-black text-[15px] overflow-hidden disabled:opacity-55 shadow-xl shadow-amber-500/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                    initial={{ x: "-120%" }}
                    whileHover={{ x: "220%" }}
                    transition={{ duration: 0.55 }}
                  />
                  <span className="relative z-10 text-black flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full block"
                        />
                        Checking...
                      </>
                    ) : (
                      "Login Karo →"
                    )}
                  </span>
                </motion.button>
              </motion.div>

            </form>
          </motion.div>
        </TiltCard>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="text-center text-[#1e2235] text-xs mt-6"
        >
          © {new Date().getFullYear()} FabriCore · Secured
        </motion.p>
      </div>
    </div>
  );
}