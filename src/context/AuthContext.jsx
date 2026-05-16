// src/context/AuthContext.jsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios         from "axios";

const AuthContext = createContext();

const isTokenExpired = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded      = JSON.parse(atob(payload));
    if (!decoded.exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return nowInSeconds >= decoded.exp;
  } catch {
    return true;
  }
};

// ── localStorage keys ─────────────────────────────────────────────
const ADMIN_KEYS = ["token", "refreshToken", "role", "admin"];
const _clearAdminStorage = () => {
  ADMIN_KEYS.forEach((k) => localStorage.removeItem(k));
};

export function AuthProvider({ children }) {
  const [admin,   setAdmin]   = useState(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  // ── Logout ────────────────────────────────────────────────────
  const logout = useCallback(() => {
    _clearAdminStorage();
    setAdmin(null);
    router.replace("/login");
  }, [router]);

  // ── Startup: token verify + refresh if needed ─────────────────
  useEffect(() => {
    const initialize = async () => {
      const token        = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refreshToken");
      const role         = localStorage.getItem("role");
      const storedAdmin  = localStorage.getItem("admin");

      // Koi token hi nahi → clear state, useProtectedRoute redirect karega
      if (!token || !role || !storedAdmin) {
        setLoading(false);
        return;
      }

      // ── Case 1: Token valid hai → seedha set karo ──────────────
      if (!isTokenExpired(token)) {
        try {
          setAdmin({ token, refreshToken, role, ...JSON.parse(storedAdmin) });
        } catch {
          _clearAdminStorage();
        }
        setLoading(false);
        return;
      }

      // ── Case 2: Access token expired ───────────────────────────
      // Refresh token nahi → clear karo, redirect hoga
      if (!refreshToken) {
        _clearAdminStorage();
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });

        if (data.success && data.accessToken) {
          localStorage.setItem("token", data.accessToken);
          const parsed  = JSON.parse(storedAdmin);
          const updated = { ...parsed, token: data.accessToken, refreshToken, role };
          localStorage.setItem("admin", JSON.stringify(updated));
          setAdmin(updated);
        } else {
          // Unexpected response → clear
          _clearAdminStorage();
        }

      } catch (err) {
        _clearAdminStorage();
      }

      setLoading(false);
    };

    initialize();
  }, []);

  // ── Login: dono tokens store karo ────────────────────────────
  const login = useCallback((data) => {
    localStorage.setItem("token",        data.token);
    localStorage.setItem("refreshToken", data.refreshToken || "");
    localStorage.setItem("role",         data.role || "SuperAdmin");
    localStorage.setItem("admin",        JSON.stringify(data));
    setAdmin(data);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const storedRefresh = localStorage.getItem("refreshToken");

    if (!storedRefresh) {
      logout();
      return null;
    }

    try {
      const { data } = await axios.post("/api/auth/refresh", {
        refreshToken: storedRefresh,
      });

      if (data.success && data.accessToken) {
        localStorage.setItem("token", data.accessToken);
        setAdmin((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, token: data.accessToken };
          localStorage.setItem("admin", JSON.stringify(updated));
          return updated;
        });
        return data.accessToken;
      }

      logout();
      return null;

    } catch (err) {
      const code = err?.response?.data?.code;
      if (
        code === "REFRESH_EXPIRED" ||
        code === "REFRESH_INVALID" ||
        code === "USER_NOT_FOUND"
      ) {
        logout();
      }
      return null;
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      admin,
      loading,
      login,
      logout,
      refreshAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}