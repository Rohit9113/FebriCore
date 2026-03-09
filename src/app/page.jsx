"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// ─── Particle canvas background ──────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    let   animId;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 55;
    const particles = Array.from({ length: COUNT }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      r:    Math.random() * 1.4 + 0.3,
      vx:   (Math.random() - 0.5) * 0.35,
      vy:   (Math.random() - 0.5) * 0.35,
      a:    Math.random() * 0.45 + 0.08,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${p.a})`;
        ctx.fill();
      });

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.06 * (1 - dist / 110)})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

// ─── Magnetic button ─────────────────────────────────────────────
function MagneticButton({ children, className, href, onClick }) {
  const ref   = useRef(null);
  const x     = useMotionValue(0);
  const y     = useMotionValue(0);
  const sx    = useSpring(x, { stiffness: 200, damping: 20 });
  const sy    = useSpring(y, { stiffness: 200, damping: 20 });

  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    x.set((e.clientX - cx) * 0.28);
    y.set((e.clientY - cy) * 0.28);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  const Tag = href ? motion.create(Link) : motion.button;

  return (
    <Tag
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.96 }}
      className={className}
    >
      {children}
    </Tag>
  );
}

// ─── Scroll reveal wrapper ────────────────────────────────────────
function Reveal({ children, delay = 0, y = 32 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated counter ────────────────────────────────────────────
function Counter({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const steps  = 50;
    const dur    = 1400;
    const step   = to / steps;
    let   cur    = 0;
    let   count  = 0;
    const timer  = setInterval(() => {
      cur += step; count++;
      setVal(Math.floor(cur));
      if (count >= steps) { setVal(to); clearInterval(timer); }
    }, dur / steps);
    return () => clearInterval(timer);
  }, [started, to]);

  return <span ref={ref}>{val.toLocaleString("en-IN")}{suffix}</span>;
}

// ─── Features data ────────────────────────────────────────────────
const FEATURES = [
  {
    icon:  "⚡",
    color: "amber",
    title: "Instant Orders",
    desc:  "Normal, contract, repair — teen types ke orders ek jagah. Create karo, track karo, complete karo.",
    tag:   "Orders",
  },
  {
    icon:  "💰",
    color: "emerald",
    title: "Smart Expenses",
    desc:  "Material, fuel, hardware — har kharcha record. Monthly reports automatic banta hai.",
    tag:   "Expenses",
  },
  {
    icon:  "👷",
    color: "blue",
    title: "Employee Manager",
    desc:  "Attendance one-tap mein. Salary auto-calculate. Payment history clear.",
    tag:   "Employees",
  },
  {
    icon:  "📊",
    color: "violet",
    title: "Live Analytics",
    desc:  "Income, profit, due — sab real-time charts mein. Monthly aur yearly comparison.",
    tag:   "Analytics",
  },
];

const COLORS = {
  amber:   { bg: "bg-amber-500/10",  border: "border-amber-500/20",  text: "text-amber-400",  dot: "bg-amber-400",  glow: "#f59e0b" },
  emerald: { bg: "bg-emerald-500/10",border: "border-emerald-500/20",text: "text-emerald-400",dot: "bg-emerald-400",glow: "#10b981" },
  blue:    { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",   dot: "bg-blue-400",   glow: "#3b82f6" },
  violet:  { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", dot: "bg-violet-400", glow: "#8b5cf6" },
};

// ─── Main component ───────────────────────────────────────────────
export default function HomePage() {
  const { admin } = useAuth();

  // mounted prevents SSR/localStorage hydration mismatch
  const [mounted,     setMounted]     = useState(false);
  const [empLoggedIn, setEmpLoggedIn] = useState(false);

  useEffect(() => {
    setEmpLoggedIn(!!localStorage.getItem("emp_token"));
    setMounted(true);
  }, []);

  // Before hydration — server-safe defaults (no auth, no localStorage)
  const isAdmin    = mounted && !!admin;
  const isEmployee = mounted && empLoggedIn && !isAdmin;
  const isLoggedIn = isAdmin || isEmployee;

  return (
    <div
      className="min-h-screen bg-[#0d0f18] overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <ParticleCanvas />

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center min-h-[94vh] px-5 text-center overflow-hidden">

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        {/* Radial glow — parallax */}
        <motion.div
          
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="w-[700px] h-[700px] bg-amber-500/15 rounded-full blur-[140px]"
          />
        </motion.div>

        {/* ── Logged in banner (replaces login CTA) ── */}
        <motion.div

          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative z-10 mb-8"
        >
          <AnimatePresence mode="wait">
            {isLoggedIn ? (
              <motion.div
                key="loggedin"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
              >
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-emerald-400 text-xs font-bold shadow-lg shadow-emerald-500/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  {isAdmin
                    ? `Welcome back, ${admin?.name?.split(" ")[0]} 👋`
                    : "Aap logged in hain 👋"}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="notloggedin"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/25 rounded-full text-amber-400 text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-500/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Business Management System
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Heading ── */}
        <motion.div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.04] tracking-tight max-w-2xl mx-auto"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Apna Business
            <br />
            <span className="relative inline-block">
              <span className="text-amber-400">Smart Manage</span>
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.9, ease: "easeOut" }}
                className="absolute -bottom-1 left-0 w-full"
                height="7"
                viewBox="0 0 300 7"
                fill="none"
              >
                <motion.path
                  d="M0 4 Q75 7 150 4 Q225 1 300 4"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.9, duration: 0.9, ease: "easeOut" }}
                />
              </motion.svg>
            </span>
            <br />
            Karo
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.55 }}
            className="mt-7 text-lg text-[#6b7a99] max-w-md mx-auto leading-relaxed"
          >
            Orders, expenses, employees — sab ek jagah.
            <br className="hidden sm:block" /> Mobile se bhi, desktop se bhi.
          </motion.p>

          {/* ── CTAs — auth-aware ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-3 mt-10 justify-center"
          >
            <AnimatePresence mode="wait">
              {isAdmin ? (
                /* Admin logged in → dashboard button */
                <motion.div
                  key="admin-cta"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <MagneticButton
                    href="/dashboard"
                    className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-2xl shadow-2xl shadow-amber-500/30 overflow-hidden transition-colors duration-150"
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/15"
                      initial={{ x: "-100%", skewX: "-12deg" }}
                      whileHover={{ x: "200%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative">⚡ Dashboard Kholo</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="relative"
                    >→</motion.span>
                  </MagneticButton>
                  <MagneticButton
                    href="/orders"
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold text-base rounded-2xl border border-white/10 transition-colors duration-150"
                  >
                    📋 Orders Dekho
                  </MagneticButton>
                </motion.div>

              ) : isEmployee ? (
                /* Employee logged in → employee dashboard */
                <motion.div
                  key="emp-cta"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <MagneticButton
                    href="/employee/dashboard"
                    className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-2xl shadow-2xl shadow-blue-500/20 overflow-hidden transition-colors duration-150"
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/10"
                      initial={{ x: "-100%", skewX: "-12deg" }}
                      whileHover={{ x: "200%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative">👷 Mera Dashboard</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="relative"
                    >→</motion.span>
                  </MagneticButton>
                </motion.div>

              ) : (
                /* Not logged in → login + dashboard */
                <motion.div
                  key="guest-cta"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <MagneticButton
                    href="/dashboard"
                    className="group relative w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-2xl shadow-2xl shadow-amber-500/25 overflow-hidden transition-colors duration-150"
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/15"
                      initial={{ x: "-100%", skewX: "-12deg" }}
                      whileHover={{ x: "200%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative">Dashboard Kholo</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="relative"
                    >→</motion.span>
                  </MagneticButton>
                  <MagneticButton
                    href="/login"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold text-base rounded-2xl border border-white/10 transition-colors duration-150"
                  >
                    🔑 Login
                  </MagneticButton>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* ── Animated stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}

          className="relative z-10 flex items-center gap-10 mt-16 flex-wrap justify-center"
        >
          {[
            { val: 100,  suffix: "%", label: "Mobile Friendly" },
            { val: 999,  suffix: "+", label: "Orders Manage"   },
            { val: 100,  suffix: "%", label: "Real-time"        },
          ].map((s) => (
            <div key={s.label} className="text-center group">
              <p
                className="text-2xl font-black text-white group-hover:text-amber-400 transition-colors duration-300"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                <Counter to={s.val} suffix={s.suffix} />
              </p>
              <p className="text-xs text-[#4a5170] mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Scroll mouse */}
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-25 z-10"
        >
          <div className="w-5 h-8 rounded-full border border-white/50 flex items-start justify-center pt-1.5">
            <motion.div
              animate={{ y: [0, 10, 0], opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="w-1 h-1.5 rounded-full bg-white"
            />
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-5 relative z-10">
        <div className="max-w-5xl mx-auto">

          <Reveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/4 border border-white/8 rounded-full text-[#4a5170] text-[11px] font-bold uppercase tracking-widest mb-4">
                Features
              </div>
              <h2
                className="text-3xl sm:text-4xl font-black text-white leading-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Sab kuch ek jagah
              </h2>
              <p className="text-[#6b7a99] mt-3 text-base max-w-sm mx-auto">
                Alag alag apps ki zarurat nahi — ye sab yahan hai.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => {
              const c = COLORS[f.color];
              return (
                <Reveal key={f.title} delay={i * 0.1}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`group relative bg-[#0f1120] border border-[#1a1e30] hover:border-[${c.glow}]/20 rounded-3xl p-6 overflow-hidden cursor-default`}
                    style={{ "--glow": c.glow }}
                  >
                    {/* Hover spotlight */}
                    <motion.div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${c.glow}18 0%, transparent 65%)`,
                      }}
                    />
                    {/* Corner particle */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 300 }}
                      className={`absolute top-4 right-4 w-2 h-2 rounded-full ${c.dot}`}
                    />

                    {/* Tag */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${c.bg} border ${c.border} rounded-full text-[10px] font-bold uppercase tracking-widest ${c.text} mb-4`}>
                      {f.tag}
                    </div>

                    <div className={`w-12 h-12 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center text-2xl mb-4`}>
                      {f.icon}
                    </div>

                    <h3
                      className="text-white font-black text-lg mb-2"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-[#6b7a99] text-sm leading-relaxed">{f.desc}</p>

                    {/* Bottom line reveal */}
                    <motion.div
                      className={`absolute bottom-0 left-0 h-[2px] ${c.dot}`}
                      initial={{ width: "0%" }}
                      whileHover={{ width: "100%" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          QUICK ACCESS — only when logged in
      ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isAdmin && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5 }}
            className="px-5 pb-16 relative z-10"
          >
            <div className="max-w-5xl mx-auto">
              <Reveal>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/8 border border-amber-500/15 rounded-full text-amber-500/80 text-[11px] font-bold uppercase tracking-widest mb-3">
                    Quick Access
                  </div>
                  <h2
                    className="text-2xl font-black text-white"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    Seedha jao
                  </h2>
                </div>
              </Reveal>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { href: "/dashboard",  icon: "⚡", label: "Dashboard",  color: "amber"   },
                  { href: "/orders",     icon: "📋", label: "Orders",     color: "emerald" },
                  { href: "/expenses",   icon: "💰", label: "Expenses",   color: "blue"    },
                  { href: "/employees",  icon: "👷", label: "Employees",  color: "violet"  },
                ].map((item, i) => {
                  const c = COLORS[item.color];
                  return (
                    <Reveal key={item.href} delay={i * 0.07}>
                      <Link href={item.href}>
                        <motion.div
                          whileHover={{ y: -3, scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className={`${c.bg} border ${c.border} rounded-2xl p-4 text-center cursor-pointer transition-all duration-200`}
                        >
                          <span className="text-2xl block mb-1.5">{item.icon}</span>
                          <p className={`text-sm font-bold ${c.text}`}>{item.label}</p>
                        </motion.div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════ */}
      <section className="px-5 pb-20 relative z-10">
        <Reveal>
          <div className="max-w-2xl mx-auto relative bg-[#0f1120] border border-amber-500/15 rounded-3xl px-8 py-14 text-center overflow-hidden">
            {/* animated ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-amber-500/8 pointer-events-none"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-amber-500/5 pointer-events-none"
            />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-amber-500/15 blur-3xl pointer-events-none" />

            <motion.span
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-5xl block mb-5"
            >
              🔨
            </motion.span>

            <h2
              className="text-2xl sm:text-3xl font-black text-white mb-3 relative z-10"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {isLoggedIn ? "Kaam shuru karo" : "Shuru karo aaj se"}
            </h2>
            <p className="text-[#6b7a99] mb-8 text-sm relative z-10">
              {isLoggedIn
                ? "Sab kuch ready hai — bas ek click."
                : "Login karo aur apna dashboard dekho — koi setup nahi chahiye."}
            </p>

            <AnimatePresence mode="wait">
              {isAdmin ? (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center relative z-10"
                >
                  <MagneticButton
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-2xl shadow-2xl shadow-amber-500/30 transition-colors duration-150 overflow-hidden relative"
                  >
                    ⚡ Dashboard Kholo
                  </MagneticButton>
                  <MagneticButton
                    href="/orders"
                    className="inline-flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold text-base rounded-2xl border border-white/10 transition-colors duration-150"
                  >
                    📋 New Order
                  </MagneticButton>
                </motion.div>
              ) : isEmployee ? (
                <motion.div
                  key="emp"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="relative z-10"
                >
                  <MagneticButton
                    href="/employee/dashboard"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-2xl shadow-2xl shadow-blue-500/20 transition-colors duration-150"
                  >
                    👷 Mera Dashboard Kholo
                  </MagneticButton>
                </motion.div>
              ) : (
                <motion.div
                  key="guest"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="relative z-10"
                >
                  <MagneticButton
                    href="/login"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-2xl shadow-2xl shadow-amber-500/30 transition-colors duration-150 overflow-hidden relative"
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/15"
                      initial={{ x: "-100%", skewX: "-12deg" }}
                      whileHover={{ x: "200%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative">🔑 Login Karo</span>
                  </MagneticButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] px-5 py-6 text-center relative z-10">
        <p className="text-[#2a2f45] text-xs">
          © {new Date().getFullYear()} FabriCore · Sab rights reserved
        </p>
      </footer>
    </div>
  );
}