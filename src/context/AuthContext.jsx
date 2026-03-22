//src/context/AuthContext.jsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [admin,   setAdmin]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token       = localStorage.getItem("token");
    const role        = localStorage.getItem("role");
    const storedAdmin = localStorage.getItem("admin");

    if (token && role && storedAdmin) {
      try {
        setAdmin({ token, role, ...JSON.parse(storedAdmin) });
      } catch {
        // corrupted data — clear karo
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("admin");
      }
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role",  data.role || "SuperAdmin");
    localStorage.setItem("admin", JSON.stringify(data));
    setAdmin(data);
  };

  // ✅ FIX: localStorage.clear() ki jagah sirf admin keys hatao
  // Doosre browser data (emp_token etc.) safe rahega
  const logout = () => {
    ["token", "role", "admin"].forEach((k) => localStorage.removeItem(k));
    setAdmin(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}