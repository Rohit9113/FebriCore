// src/app/api/middleware/rateLimit.js
//
// ✅ Rate Limiting — Login routes ke liye brute force protection
//
// Kaise kaam karta hai:
//   - Har IP ka attempt count aur timestamp track karo (in-memory Map)
//   - MAX_ATTEMPTS baar fail hone pe LOCKOUT_MINUTES ke liye block karo
//   - Successful login pe attempts reset ho jaate hain
//   - Server restart pe memory clear hoti hai (yeh okay hai)
//
// Kahan use karo:
//   - app/api/admin/login/route.js
//   - app/api/employees/auth/login/route.js
//
// Usage:
//   import { adminLoginLimiter, employeeLoginLimiter } from "@/app/api/middleware/rateLimit";
//   export const POST = adminLoginLimiter(async (req) => { ... });

// ─── Config ───────────────────────────────────────────────────────
const ADMIN_CONFIG = {
  MAX_ATTEMPTS:     5,   // 5 baar fail → lock
  LOCKOUT_MINUTES: 15,   // 15 min ke liye block
  WINDOW_MINUTES:  10,   // 10 min window mein 5 attempts
};

const EMPLOYEE_CONFIG = {
  MAX_ATTEMPTS:     8,   // Employee ke liye thoda zyada lenient
  LOCKOUT_MINUTES: 10,
  WINDOW_MINUTES:  10,
};

// ─── In-Memory Store ──────────────────────────────────────────────
// Structure: Map<ip, { attempts: number, firstAttempt: Date, lockedUntil: Date|null }>
const adminStore    = new Map();
const employeeStore = new Map();

// Cleanup — purani entries har 30 min mein hata do (memory leak prevent)
const cleanup = (store) => {
  const now = Date.now();
  for (const [ip, data] of store.entries()) {
    const windowMs = 30 * 60 * 1000; // 30 min
    if (data.firstAttempt && (now - data.firstAttempt) > windowMs) {
      store.delete(ip);
    }
  }
};

setInterval(() => {
  cleanup(adminStore);
  cleanup(employeeStore);
}, 30 * 60 * 1000);

// ─── Get IP from request ──────────────────────────────────────────
const getIP = (req) => {
  // Vercel/proxy headers check karo
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;

  return "unknown";
};

// ─── Core rate limit checker ──────────────────────────────────────
const checkRateLimit = (store, ip, config) => {
  const now      = Date.now();
  const windowMs = config.WINDOW_MINUTES  * 60 * 1000;
  const lockMs   = config.LOCKOUT_MINUTES * 60 * 1000;

  const record = store.get(ip);

  // Pehli baar aa raha hai
  if (!record) {
    return { allowed: true, remaining: config.MAX_ATTEMPTS - 1 };
  }

  // Lockout check
  if (record.lockedUntil && now < record.lockedUntil) {
    const secondsLeft = Math.ceil((record.lockedUntil - now) / 1000);
    const minsLeft    = Math.ceil(secondsLeft / 60);
    return {
      allowed:    false,
      locked:     true,
      secondsLeft,
      message:    `Bahut zyada login attempts ho gaye. ${minsLeft} minute baad dobara try karo.`,
    };
  }

  // Window expire ho gayi — reset karo
  if (record.firstAttempt && (now - record.firstAttempt) > windowMs) {
    store.delete(ip);
    return { allowed: true, remaining: config.MAX_ATTEMPTS - 1 };
  }

  // Window ke andar — attempts check karo
  if (record.attempts >= config.MAX_ATTEMPTS) {
    // Ab lock karo
    record.lockedUntil = now + lockMs;
    store.set(ip, record);
    const minsLeft = config.LOCKOUT_MINUTES;
    return {
      allowed:    false,
      locked:     true,
      secondsLeft: lockMs / 1000,
      message:    `Account temporarily lock ho gaya. ${minsLeft} minute baad dobara try karo.`,
    };
  }

  return {
    allowed:   true,
    remaining: config.MAX_ATTEMPTS - record.attempts - 1,
  };
};

// ─── Record failed attempt ────────────────────────────────────────
const recordFailedAttempt = (store, ip, config) => {
  const now    = Date.now();
  const record = store.get(ip);

  if (!record) {
    store.set(ip, { attempts: 1, firstAttempt: now, lockedUntil: null });
    return;
  }

  // Window expire ho gayi — reset karke count karo
  const windowMs = config.WINDOW_MINUTES * 60 * 1000;
  if (record.firstAttempt && (now - record.firstAttempt) > windowMs) {
    store.set(ip, { attempts: 1, firstAttempt: now, lockedUntil: null });
    return;
  }

  record.attempts += 1;
  store.set(ip, record);
};

// ─── Reset on successful login ────────────────────────────────────
const resetAttempts = (store, ip) => {
  store.delete(ip);
};

// ─── Rate limit headers helper ────────────────────────────────────
const makeHeaders = (result, config) => ({
  "X-RateLimit-Limit":     String(config.MAX_ATTEMPTS),
  "X-RateLimit-Remaining": String(Math.max(0, result.remaining ?? 0)),
  "Retry-After":           result.secondsLeft ? String(result.secondsLeft) : "0",
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN LOGIN LIMITER
// ═══════════════════════════════════════════════════════════════════
export const adminLoginLimiter = (handler) => {
  return async (req, context) => {
    const ip     = getIP(req);
    const result = checkRateLimit(adminStore, ip, ADMIN_CONFIG);

    // Blocked → reject immediately
    if (!result.allowed) {
      return Response.json(
        {
          success: false,
          error:   result.message,
          locked:  true,
          retryAfterSeconds: result.secondsLeft,
        },
        {
          status:  429,
          headers: makeHeaders(result, ADMIN_CONFIG),
        }
      );
    }

    // Handler call karo — response capture karo
    const response = await handler(req, context);

    // Response check karo — fail hua toh attempt record karo
    try {
      const cloned = response.clone();
      const body   = await cloned.json();

      if (!body.success) {
        // Login fail hua — attempt count badhao
        recordFailedAttempt(adminStore, ip, ADMIN_CONFIG);
      } else {
        // Login success — attempts reset karo
        resetAttempts(adminStore, ip);
      }
    } catch {
      // JSON parse nahi hua — safe ignore
    }

    return response;
  };
};

// ═══════════════════════════════════════════════════════════════════
// EMPLOYEE LOGIN LIMITER
// ═══════════════════════════════════════════════════════════════════
export const employeeLoginLimiter = (handler) => {
  return async (req, context) => {
    const ip     = getIP(req);
    const result = checkRateLimit(employeeStore, ip, EMPLOYEE_CONFIG);

    if (!result.allowed) {
      return Response.json(
        {
          success: false,
          error:   result.message,
          locked:  true,
          retryAfterSeconds: result.secondsLeft,
        },
        {
          status:  429,
          headers: makeHeaders(result, EMPLOYEE_CONFIG),
        }
      );
    }

    const response = await handler(req, context);

    try {
      const cloned = response.clone();
      const body   = await cloned.json();

      if (!body.success) {
        recordFailedAttempt(employeeStore, ip, EMPLOYEE_CONFIG);
      } else {
        resetAttempts(employeeStore, ip);
      }
    } catch { /* ignore */ }

    return response;
  };
};

// ─── Manual reset utility (admin panel se use karo agar chahiye) ──
// Kisi IP ko manually unlock karna ho toh:
export const unlockIP = (ip, type = "admin") => {
  const store = type === "admin" ? adminStore : employeeStore;
  store.delete(ip);
  return { success: true, message: `${ip} unlock ho gaya` };
};