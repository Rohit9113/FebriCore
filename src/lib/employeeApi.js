// src/lib/employeeApi.js
import axios from "axios";

const employeeApi = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ───────────────────────────────────────────
employeeApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("emp_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Refresh queue ─────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
};

// ── Response interceptor ──────────────────────────────────────────
employeeApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status          = error.response?.status;
    const code            = error.response?.data?.code;

    if (status === 401 && code === "TOKEN_EXPIRED" && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return employeeApi(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      const refreshToken = localStorage.getItem("emp_refresh_token");

      if (!refreshToken) {
        _handleLogout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });

        if (data.success && data.accessToken) {
          localStorage.setItem("emp_token", data.accessToken);
          processQueue(null, data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return employeeApi(originalRequest);
        }

        processQueue(error, null);
        _handleLogout();
        return Promise.reject(error);

      } catch (refreshError) {
        processQueue(refreshError, null);
        const refreshCode = refreshError?.response?.data?.code;

        if (
          refreshCode === "REFRESH_EXPIRED"   ||
          refreshCode === "REFRESH_INVALID"   ||
          refreshCode === "USER_NOT_FOUND"    ||
          refreshCode === "ACCOUNT_DEACTIVATED"
        ) {
          _handleLogout();
        }
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && code === "TOKEN_INVALID") {
      _handleLogout();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

const _handleLogout = () => {
  ["emp_token", "emp_refresh_token", "emp_name", "emp_id", "emp_empId"]
    .forEach((k) => localStorage.removeItem(k));
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

export default employeeApi;