// src/hooks/useProtectedRoute.jsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth }   from "@/context/AuthContext";

export default function useProtectedRoute({ roles = [] }) {
  const router        = useRouter();
  const { admin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (admin && roles.includes(admin.role)) return;

    const empToken = typeof window !== "undefined"
      ? localStorage.getItem("emp_token")
      : null;

    if (empToken) {
      router.replace("/employee/dashboard");
      return;
    }
    router.replace("/login");

  }, [admin, loading, roles, router]);
}