//src/hooks/useProtectedRoute.jsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function useProtectedRoute({ roles = [] }) {
  const router = useRouter();
  const { admin, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!admin || !roles.includes(admin.role)) {
        router.replace("/login");
      }
    }
  }, [admin, loading, roles, router]);
}
