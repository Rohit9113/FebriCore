"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function useEmployeeRoute() {
  const router = useRouter();
  const [empData, setEmpData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("emp_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setEmpData({
      token,
      name:  localStorage.getItem("emp_name")  || "",
      id:    localStorage.getItem("emp_id")    || "",
      empId: localStorage.getItem("emp_empId") || "",
    });
    setLoading(false);
  }, [router]);

  const logout = () => {
    ["emp_token", "emp_name", "emp_id", "emp_empId"].forEach((k) =>
      localStorage.removeItem(k)
    );
    router.push("/login");
  };

  return { empData, loading, logout };
}