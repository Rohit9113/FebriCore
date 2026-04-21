// src/hooks/useEmployeeRoute.jsx
//
// ✅ FIX 1: Error messages consistent kiye — Hindi mein sab
// ✅ FIX 2: Deactivated hone pe page redirect nahi hota tha
//   Ab: deactivated state set hoti hai aur consuming component
//       ko clearly pata chalta hai kya karna hai
// ✅ FIX 3: TOKEN_EXPIRED code handle kiya — alag message

"use client";
import { useEffect, useState } from "react";
import { useRouter }           from "next/navigation";
import axios                   from "axios";

export default function useEmployeeRoute() {
  const router = useRouter();
  const [empData,      setEmpData]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [deactivated,  setDeactivated]  = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("emp_token");

    if (!token) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const verifyEmployee = async () => {
      try {
        const response = await axios.get("/api/employees/me", {
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          setEmpData({
            token,
            name:    localStorage.getItem("emp_name"),
            id:      localStorage.getItem("emp_id"),
            empId:   localStorage.getItem("emp_empId"),
            profile: response.data.data.profile,
            isActive:response.data.data.profile.isActive,
          });
          setDeactivated(false);
          setError(null);
        }

      } catch (err) {
        // ✅ FIX 30: Dev-only guard — production mein console.error nahi dikhega
        if (process.env.NODE_ENV === "development") {
          console.error("Employee verification error:", err);
        }

        const status    = err.response?.status;
        const errorCode = err.response?.data?.code;
        const errorMsg  = err.response?.data?.error;

        if (status === 403 && errorCode === "ACCOUNT_DEACTIVATED") {
          // ✅ FIX 2: Deactivated — localStorage clear karo
          setDeactivated(true);
          setError(errorMsg || "Aapka account deactivate ho gaya hai"); // ✅ consistent
          localStorage.removeItem("emp_token");
          localStorage.removeItem("emp_name");
          localStorage.removeItem("emp_id");
          localStorage.removeItem("emp_empId");
          // ✅ FIX 2: Deactivated screen dikhao — redirect mat karo
          // Consuming component deactivated = true check karke
          // apna message dikha sakta hai

        } else if (status === 401) {
          // ✅ FIX 3: Token expired vs invalid — alag messages
          const isExpired = errorCode === "TOKEN_EXPIRED";
          setError(isExpired
            ? "Session expire ho gaya — dobara login karo" // ✅ consistent
            : "Token invalid hai — dobara login karo"       // ✅ consistent
          );
          localStorage.removeItem("emp_token");
          localStorage.removeItem("emp_name");
          localStorage.removeItem("emp_id");
          localStorage.removeItem("emp_empId");
          router.replace("/login");

        } else if (status === 404) {
          setError("Employee record nahi mila — admin se baat karo"); // ✅ consistent
          localStorage.removeItem("emp_token");
          router.replace("/login");

        } else {
          // Network ya server error
          setError("Server se connection error — dobara try karo"); // ✅ consistent
        }
      } finally {
        setLoading(false);
      }
    };

    verifyEmployee();
  }, [router]);

  const logout = () => {
    ["emp_token", "emp_name", "emp_id", "emp_empId"].forEach(
      (k) => localStorage.removeItem(k)
    );
    router.push("/login");
  };

  return {
    empData,
    loading,
    deactivated,
    error,
    logout,
  };
}