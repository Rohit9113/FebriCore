//src/app/page.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// ─── Particle canvas background ───────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const COUNT = 55;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.45 + 0.08,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${p.a})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.06 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export default function HomePage() {
  const { admin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [empLoggedIn, setEmpLoggedIn] = useState(false);

  useEffect(() => {
    setEmpLoggedIn(!!localStorage.getItem("emp_token"));
    setMounted(true);
  }, []);

  const isAdmin    = mounted && !!admin;
  const isEmployee = mounted && empLoggedIn && !isAdmin;
  const isLoggedIn = isAdmin || isEmployee;

  const dashboardHref = isAdmin ? "/dashboard" : "/employee/dashboard";

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#0d0f18] flex flex-col items-center justify-center px-5 text-center relative"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <ParticleCanvas />

      {/* Soft glow behind content */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[130px] pointer-events-none z-0"
      />

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight max-w-2xl"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Apna Business
        <br />
        <span className="text-amber-400">Smart Manage</span>Karo
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative z-10 mt-6 text-lg text-[#6b7a99] max-w-md leading-relaxed"
      >
        Orders, employees — sab ek jagah.
        <br className="hidden sm:block" /> Mobile se bhi, desktop se bhi.
      </motion.p>

      {isLoggedIn && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative z-10 mt-10"
        >
          <Link
            href={dashboardHref}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-2xl shadow-2xl shadow-amber-500/25 transition-colors duration-150"
          >
            ⚡ Dashboard Kholo
          </Link>
        </motion.div>
      )}
    </div>
  );
}