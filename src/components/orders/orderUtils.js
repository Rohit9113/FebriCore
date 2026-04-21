// src/components/orders/orderUtils.js
// Shared utilities — teeno tab components import karte hain

import axios from "axios";

// ─── API ──────────────────────────────────────────────────────────
export const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role  = typeof window !== "undefined" ? localStorage.getItem("role")  : null;
  if (token) cfg.headers.Authorization  = `Bearer ${token}`;
  if (role)  cfg.headers["x-user-role"] = role;
  return cfg;
});

// ─── Formatters ───────────────────────────────────────────────────
export const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};
export const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// ─── Normalizers ──────────────────────────────────────────────────
export const normalizeOrder = (item) => ({
  id:             item._id,
  customer: {
    name:    item.customer?.name,
    phone:   item.customer?.phone,
    address: item.customer?.address,
    date:    item.orders?.[0]?.date,
  },
  orders:         item.orders         || [],
  status:         item.orders?.every((o) => o.status === "Partially Completed")
                    ? "Partially Completed" : "Pending",
  lastPayment:    item.lastPayment    || null,
  paymentHistory: item.paymentHistory || [],
});

export const normalizeCompleted = (item) => ({
  id:       item._id,
  customer: {
    name:    item.customer?.name,
    phone:   item.customer?.phone,
    address: item.customer?.address,
    date:    item.createdAt,
  },
  orders:  item.orders         || [],
  payment: item.paymentReceive || {},
});

// ─── Grouping ─────────────────────────────────────────────────────
export const groupOrders = (orders) => {
  const map = {};
  (orders || []).forEach((o) => {
    const k = o.itemType || "Order";
    if (!map[k]) map[k] = [];
    map[k].push(o);
  });
  return Object.entries(map);
};

// ─── Constants ────────────────────────────────────────────────────
export const METAL_OPTIONS = [
  { value: "MS",    label: "MS",             color: "#3b82f6" },
  { value: "GI",    label: "GI",             color: "#10b981" },
  { value: "Other", label: "Other",          color: "#8b5cf6" },
  { value: "N/A",   label: "N/A (Contract)", color: "#6b7280" },
];

export const EMPTY_EXTRA = () => ({ name: "", amount: "" });
export const EMPTY_ENTRY = () => ({
  label: "", weight: "", ratePerKg: "", amount: "", metalType: "MS", extraCharges: [],
});

export const inp = "w-full bg-[#0c0e1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/60 transition";