"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

// ─── Routes ──────────────────────────────────────────────────────
// Admin ke liye sirf top-level routes (sub-sections dashboard ke andar hain)
const BASE_LINKS = [
  { href: "/",          label: "Home",      icon: "🏠" },
];
const ADMIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "⚡" },
];
const EMP_LINKS = [
  { href: "/employee/dashboard", label: "My Dashboard", icon: "📊" },
];

// ─── Animated hamburger icon ──────────────────────────────────────
function HamburgerIcon({ open }) {
  return (
    <div className="w-5 h-4 flex flex-col justify-between">
      <motion.span
        animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="block h-0.5 rounded-full bg-white origin-center"
      />
      <motion.span
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.15 }}
        className="block h-0.5 rounded-full bg-white"
      />
      <motion.span
        animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="block h-0.5 rounded-full bg-white origin-center"
      />
    </div>
  );
}

// ─── Avatar badge ──────────────────────────────────────────────────
function Avatar({ letter, color = "amber", size = "sm" }) {
  const sz  = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-base";
  const cls = color === "blue"
    ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
    : "bg-amber-500/20 border-amber-500/30 text-amber-400";
  return (
    <div className={`${sz} rounded-xl border flex items-center justify-center font-black ${cls}`}>
      {letter?.toUpperCase() || "?"}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function Navbar() {
  const pathname            = usePathname();
  const router              = useRouter();
  const { admin, logout: adminLogout } = useAuth();

  const [drawerOpen, setDrawer] = useState(false);
  const [dropOpen,   setDrop]   = useState(false);
  const [scrolled,   setScrolled] = useState(false);
  const [mounted,    setMounted] = useState(false);
  const [empData,    setEmpData] = useState(null);

  const dropRef = useRef(null);

  // ── SSR-safe mount + emp check ────────────────────────────────
  useEffect(() => {
    setMounted(true);
    checkEmp();
  }, []);

  // Re-check on route change
  useEffect(() => { if (mounted) checkEmp(); }, [pathname, mounted]);

  function checkEmp() {
    const token = localStorage.getItem("emp_token");
    if (token) {
      setEmpData({
        name:  localStorage.getItem("emp_name")  || "Employee",
        empId: localStorage.getItem("emp_empId") || "",
      });
    } else {
      setEmpData(null);
    }
  }

  const isAdmin    = mounted && !!admin;
  const isEmployee = mounted && !!empData && !isAdmin;

  const navLinks = isAdmin
    ? [...BASE_LINKS, ...ADMIN_LINKS]
    : isEmployee
    ? [...BASE_LINKS, ...EMP_LINKS]
    : BASE_LINKS;

  // ── Scroll ───────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Close drawer on route change ─────────────────────────────
  useEffect(() => { setDrawer(false); setDrop(false); }, [pathname]);

  // ── Body scroll lock ─────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // ── Click outside dropdown ───────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDrop(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Logout ───────────────────────────────────────────────────
  const handleAdminLogout = useCallback(() => {
    adminLogout();
    setDrawer(false); setDrop(false);
  }, [adminLogout]);

  const handleEmpLogout = useCallback(() => {
    ["emp_token","emp_name","emp_id","emp_empId"].forEach(k => localStorage.removeItem(k));
    setEmpData(null);
    setDrawer(false); setDrop(false);
    router.replace("/login");
  }, [router]);

  // ── Hide on employee dashboard (has its own full header) ─────
  if (pathname?.startsWith("/employee/dashboard")) return null;

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  // Colors by role
  const roleAccent  = isEmployee ? "#3b82f6" : "#f59e0b";
  const roleActBg   = isEmployee ? "bg-blue-500/10 border border-blue-500/20"   : "bg-amber-500/10 border border-amber-500/20";
  const roleActText = isEmployee ? "text-blue-400"  : "text-amber-400";

  // Who is logged in
  const loggedUser = isAdmin
    ? { name: admin.name, sub: admin.role, color: "amber" }
    : isEmployee
    ? { name: empData.name, sub: empData.empId || "Employee", color: "blue" }
    : null;

  const handleLogout = isAdmin ? handleAdminLogout : handleEmpLogout;

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16"
        style={{
          background: scrolled ? "rgba(8,10,20,0.94)" : "#080a14",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}`,
          transition: "all 0.3s ease",
          boxShadow: scrolled ? "0 4px 40px rgba(0,0,0,0.4)" : "none",
        }}
      >
        <div className="flex items-center h-full px-4 lg:px-8 max-w-screen-2xl mx-auto gap-3">

          {/* ── Logo ────────────────────────────────────────── */}
          <Link
            href="/"
            onClick={() => setDrawer(false)}
            className="flex items-center gap-2.5 flex-shrink-0 mr-auto md:mr-6"
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-black font-black text-sm"
              style={{ background: "#f59e0b", boxShadow: "0 0 20px #f59e0b40" }}
            >F</motion.div>
            <span
              className="text-white font-black text-lg tracking-tight hidden sm:inline"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Fabri<span style={{ color: "#f59e0b" }}>Core</span>
            </span>
          </Link>

          {/* ── Desktop nav links ────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-150
                    ${active ? roleActText : "text-[#6b7280] hover:text-white"}`}
                >
                  <span className="text-base leading-none">{link.icon}</span>
                  <span>{link.label}</span>
                  {active && (
                    <motion.div
                      layoutId="navbar-active-pill"
                      className={`absolute inset-0 rounded-xl -z-10 ${roleActBg}`}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Desktop Right: profile OR login ─────────────── */}
          <div className="hidden md:flex items-center gap-2">
            {/* If someone is logged in */}
            {loggedUser && mounted && (
              <div ref={dropRef} className="relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDrop(p => !p)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderColor: dropOpen ? `${roleAccent}40` : "rgba(255,255,255,0.07)",
                  }}
                >
                  <Avatar letter={loggedUser.name?.charAt(0)} color={loggedUser.color} size="sm" />
                  <span className="text-white text-sm font-medium max-w-[110px] truncate">
                    {loggedUser.name}
                  </span>
                  <motion.span
                    animate={{ rotate: dropOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[10px] text-gray-500"
                  >▾</motion.span>
                </motion.button>

                {/* Dropdown */}
                <AnimatePresence>
                  {dropOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl overflow-hidden z-[60]"
                      style={{
                        background: "#0f1120",
                        border: "1px solid rgba(255,255,255,0.09)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                      }}
                    >
                      {/* Profile header */}
                      <div className="px-4 py-4 flex items-center gap-3"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          background: `${roleAccent}08`,
                        }}>
                        <Avatar letter={loggedUser.name?.charAt(0)} color={loggedUser.color} size="lg" />
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm truncate">{loggedUser.name}</p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: roleAccent }}>
                            {loggedUser.sub}
                          </p>
                        </div>
                      </div>

                      {/* Extra info */}
                      {isAdmin && (admin?.phone || admin?.email) && (
                        <div className="px-4 py-2.5 space-y-1.5"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {admin.phone && (
                            <p className="text-xs text-[#4a5580]">📞 {admin.phone}</p>
                          )}
                          {admin.email && (
                            <p className="text-xs text-[#4a5580] truncate">✉️ {admin.email}</p>
                          )}
                        </div>
                      )}

                      {/* Links */}
                      <div className="p-2">
                        {isEmployee && (
                          <Link
                            href="/employee/dashboard"
                            onClick={() => setDrop(false)}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                          >
                            <span>📊</span> My Dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <span>🚪</span> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Not logged in */}
            {!loggedUser && mounted && (
              <Link href="/login">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-black text-sm font-black"
                  style={{ background: "#f59e0b", boxShadow: "0 4px 20px #f59e0b30" }}
                >
                  🔑 Login
                </motion.div>
              </Link>
            )}

            {/* Pre-mount placeholder */}
            {!mounted && (
              <div className="w-24 h-9 rounded-xl bg-white/[0.04] animate-pulse" />
            )}
          </div>

          {/* ── Hamburger (mobile) ───────────────────────────── */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setDrawer(p => !p)}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: drawerOpen ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${drawerOpen ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <HamburgerIcon open={drawerOpen} />
          </motion.button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 z-50 md:hidden flex flex-col"
              style={{
                width: "min(300px, 85vw)",
                background: "#0d0f1e",
                borderLeft: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Link href="/" onClick={() => setDrawer(false)} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black text-sm">
                    F
                  </div>
                  <span className="text-white font-black text-base" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Fabri<span style={{ color: "#f59e0b" }}>Core</span>
                  </span>
                </Link>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setDrawer(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >✕</motion.button>
              </div>

              {/* User strip (if logged in) */}
              {loggedUser && mounted && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                  className="mx-4 mt-4 p-3.5 rounded-2xl flex items-center gap-3"
                  style={{
                    background: `${roleAccent}10`,
                    border: `1px solid ${roleAccent}25`,
                  }}
                >
                  <Avatar letter={loggedUser.name?.charAt(0)} color={loggedUser.color} size="lg" />
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{loggedUser.name}</p>
                    <p className="text-xs font-medium" style={{ color: roleAccent }}>{loggedUser.sub}</p>
                  </div>
                </motion.div>
              )}

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {navLinks.map((link, i) => {
                  const active = isActive(link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04, type: "spring", stiffness: 300, damping: 28 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setDrawer(false)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold transition-colors"
                        style={{
                          background:   active ? `${roleAccent}15` : "transparent",
                          border:       `1px solid ${active ? `${roleAccent}30` : "transparent"}`,
                          color:        active ? roleAccent : "#6b7a99",
                        }}
                      >
                        <span className="text-xl w-7 text-center">{link.icon}</span>
                        <span className="text-base">{link.label}</span>
                        {active && <span className="ml-auto text-sm" style={{ color: roleAccent }}>●</span>}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Bottom action */}
              <div className="px-4 pb-8 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {loggedUser ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleLogout}
                    className="w-full py-3.5 rounded-2xl text-red-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.18)",
                    }}
                  >
                    🚪 Logout karo
                  </motion.button>
                ) : (
                  <Link href="/login" onClick={() => setDrawer(false)}>
                    <motion.div
                      whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-2xl text-black font-black text-sm flex items-center justify-center gap-2"
                      style={{
                        background: "#f59e0b",
                        boxShadow: "0 4px 20px #f59e0b30",
                      }}
                    >
                      🔑 Login karo
                    </motion.div>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}