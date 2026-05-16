// src/lib/adminApi.js
import axios from "axios";

const adminApi = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing    = false;
let failedQueue     = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

adminApi.interceptors.response.use(
  // Success response → seedha return karo
  (response) => response,

  // Error response → check karo
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
          return adminApi(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        // Refresh token hi nahi → logout
        _handleLogout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });

        if (data.success && data.accessToken) {
          localStorage.setItem("token", data.accessToken);

          try {
            const stored  = localStorage.getItem("admin");
            const parsed  = JSON.parse(stored);
            const updated = { ...parsed, token: data.accessToken };
            localStorage.setItem("admin", JSON.stringify(updated));
          } catch { /* ignore */ }

          processQueue(null, data.accessToken);

          // Original request retry karo naye token se
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return adminApi(originalRequest);
        }

        // Unexpected response
        processQueue(error, null);
        _handleLogout();
        return Promise.reject(error);

      } catch (refreshError) {
        processQueue(refreshError, null);
        const refreshCode = refreshError?.response?.data?.code;

        if (
          refreshCode === "REFRESH_EXPIRED" ||
          refreshCode === "REFRESH_INVALID" ||
          refreshCode === "USER_NOT_FOUND"
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

    // Baaki errors → as-is throw karo
    return Promise.reject(error);
  }
);

const _handleLogout = () => {
  ["token", "refreshToken", "role", "admin"].forEach(
    (k) => localStorage.removeItem(k)
  );
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

export default adminApi;