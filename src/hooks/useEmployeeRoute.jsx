// src/hooks/useEmployeeRoute.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter }                        from "next/navigation";
import axios                                from "axios";

// ── Employee localStorage keys ────────────────────────────────────
const EMP_KEYS = ["emp_token", "emp_refresh_token", "emp_name", "emp_id", "emp_empId"];

const clearEmpStorage = () => {
  EMP_KEYS.forEach((k) => localStorage.removeItem(k));
};

export default function useEmployeeRoute() {
  const router = useRouter();
  const [empData,     setEmpData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [deactivated, setDeactivated] = useState(false);
  const [error,       setError]       = useState(null);

  // ── Logout ──────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearEmpStorage();
    router.push("/login");
  }, [router]);

  const refreshToken = useCallback(async () => {
    const storedRefresh = localStorage.getItem("emp_refresh_token");
    if (!storedRefresh) return null;

    try {
      const { data } = await axios.post("/api/auth/refresh", {
        refreshToken: storedRefresh,
      });

      if (data.success && data.accessToken) {
        localStorage.setItem("emp_token", data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch (err) {
      const code = err?.response?.data?.code;

      if (code === "ACCOUNT_DEACTIVATED") {
        setDeactivated(true);
        setError("Aapka account deactivate ho gaya hai");
        clearEmpStorage();
        return null;
      }
      return null;
    }
  }, []);

  // ── Verify employee with API ─────────────────────────────────────
  const verifyEmployee = useCallback(async (token) => {
    const response = await axios.get("/api/employees/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("emp_token");

    if (!token) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const run = async () => {
      try {
        // ── First attempt ─────────────────────────────────────────
        const result = await verifyEmployee(token);

        if (result.success) {
          setEmpData({
            token,
            name:     localStorage.getItem("emp_name"),
            id:       localStorage.getItem("emp_id"),
            empId:    localStorage.getItem("emp_empId"),
            profile:  result.data.profile,
            isActive: result.data.profile.isActive,
          });
          setDeactivated(false);
          setError(null);
        }

      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("Employee verification error:", err);
        }

        const status    = err.response?.status;
        const errorCode = err.response?.data?.code;
        const errorMsg  = err.response?.data?.error;

        if (status === 401 && errorCode === "TOKEN_EXPIRED") {
          const newToken = await refreshToken();

          if (newToken) {
            try {
              const retryResult = await verifyEmployee(newToken);

              if (retryResult.success) {
                setEmpData({
                  token:    newToken,
                  name:     localStorage.getItem("emp_name"),
                  id:       localStorage.getItem("emp_id"),
                  empId:    localStorage.getItem("emp_empId"),
                  profile:  retryResult.data.profile,
                  isActive: retryResult.data.profile.isActive,
                });
                setDeactivated(false);
                setError(null);
                setLoading(false);
                return;
              }
            } catch (retryErr) {
              // Retry bhi fail — ab logout
              if (process.env.NODE_ENV === "development") {
                console.error("Retry verify failed:", retryErr);
              }
            }
          }

          // Refresh bhi fail — logout
          setError("Session expire ho gaya — dobara login karo");
          clearEmpStorage();
          router.replace("/login");
          return;
        }

        // ── Other error cases ─────────────────────────────────────
        if (status === 403 && errorCode === "ACCOUNT_DEACTIVATED") {
          setDeactivated(true);
          setError(errorMsg || "Aapka account deactivate ho gaya hai");
          clearEmpStorage();
          return;
        }

        if (status === 401) {
          // Token invalid (not expired, just bad)
          setError("Token invalid hai — dobara login karo");
          clearEmpStorage();
          router.replace("/login");
          return;
        }

        if (status === 404) {
          setError("Employee record nahi mila — admin se baat karo");
          clearEmpStorage();
          router.replace("/login");
          return;
        }

        // Network ya server error
        setError("Server se connection error — dobara try karo");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, verifyEmployee, refreshToken]);

  return {
    empData,
    loading,
    deactivated,
    error,
    logout,
    refreshToken,
  };
}