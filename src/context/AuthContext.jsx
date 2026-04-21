// src/context/AuthContext.jsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ FIX BUG 5: router import

const AuthContext = createContext();
const isTokenExpired = (token) => {
  try {
    // JWT format: header.payload.signature
    const payload = token.split(".")[1];
    if (!payload) return true;

    // Base64 decode
    const decoded = JSON.parse(atob(payload));

    // exp = expiry timestamp in seconds
    if (!decoded.exp) return false;

    // Current time seconds mein
    const nowInSeconds = Math.floor(Date.now() / 1000);

    // Agar current time exp se zyada hai toh expired
    return nowInSeconds >= decoded.exp;
  } catch {
    // Decode fail hone pe invalid token maano
    return true;
  }
};

export function AuthProvider({ children }) {
  const [admin,   setAdmin]   = useState(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter(); // ✅ FIX BUG 5: router use karo

  useEffect(() => {
    const token       = localStorage.getItem("token");
    const role        = localStorage.getItem("role");
    const storedAdmin = localStorage.getItem("admin");

    if (token && role && storedAdmin) {
      if (isTokenExpired(token)) {
        // Token expire ho gaya — silently clear karo
        // ✅ FIX 30: console.log hata diya — production mein nahi chahiye
        ["token", "role", "admin"].forEach((k) => localStorage.removeItem(k));
        setLoading(false);
        return;
      }

      try {
        setAdmin({ token, role, ...JSON.parse(storedAdmin) });
      } catch {
        // Corrupted data — clear karo
        ["token", "role", "admin"].forEach((k) => localStorage.removeItem(k));
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
  const logout = () => {
    // Sirf admin keys hatao — emp_token etc. safe rahega
    ["token", "role", "admin"].forEach((k) => localStorage.removeItem(k));
    setAdmin(null);
    router.replace("/login"); // ✅ FIX: No full page reload
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