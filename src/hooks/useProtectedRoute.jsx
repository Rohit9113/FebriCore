// src/hooks/useProtectedRoute.jsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth }   from "@/context/AuthContext";

const isTokenExpired = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded      = JSON.parse(atob(payload));
    if (!decoded.exp)  return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return nowInSeconds >= decoded.exp;
  } catch {
    return true;
  }
};

export default function useProtectedRoute({ roles = [] }) {
  const router             = useRouter();
  const { admin, loading } = useAuth();

  useEffect(() => {
    // Loading ke dauran kuch mat karo — AuthContext verify kar raha hai
    if (loading) return;

    // Admin logged in hai aur role match karta hai → dashboard allow
    if (admin && roles.includes(admin.role)) return;

    // Employee token check
    const empToken = typeof window !== "undefined"
      ? localStorage.getItem("emp_token")
      : null;

    if (empToken) {
      if (!isTokenExpired(empToken)) {
        router.replace("/employee/dashboard");
        return;
      }
      ["emp_token", "emp_refresh_token", "emp_name", "emp_id", "emp_empId"]
        .forEach((k) => localStorage.removeItem(k));
    }

    router.replace("/login");

  }, [admin, loading, roles, router]);
}