// app/api/middleware/auth.js
//
// ✅ FIX 3: Refresh Token system add kiya
//
// Pehle:
//   - Sirf ek access token tha — 7 din mein expire
//   - Expire hone pe user ko manually login karna padta tha
//
// Ab:
//   - Access Token  → 15 min (short-lived, har API request mein jaata hai)
//   - Refresh Token → 7 din  (long-lived, sirf /api/auth/refresh pe jaata hai)
//   - Access expire ho  → client refresh token bhejta hai → naya access token milta hai
//   - Refresh expire ho → tab hi actual login karna padta hai
//   - User experience: 7 din tak seamless — bich mein koi interrupt nahi
//
// Token lifetimes:
//   ACCESS_TOKEN_EXPIRY  = "15m"
//   REFRESH_TOKEN_EXPIRY = "7d"

import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_EXPIRY  = "15m";
export const REFRESH_TOKEN_EXPIRY = "7d";

// ─────────────────────────────────────────────────────────────────
// Token generators — dono jagah same format use karo
// ─────────────────────────────────────────────────────────────────
export const generateAccessToken = (payload) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = (payload) => {
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET not set");
  // Refresh token mein sirf minimum data — security ke liye
  return jwt.sign(
    { _id: payload._id, role: payload.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

export const verifyRefreshToken = (token) => {
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET not set");
  return jwt.verify(token, REFRESH_SECRET);
};

// ─────────────────────────────────────────────────────────────────
// verifyAdmin
// Admin routes ke liye — role must be "SuperAdmin"
// ─────────────────────────────────────────────────────────────────
export const verifyAdmin = (handler) => {
  return async (req, context) => {
    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        console.error("CRITICAL: JWT_SECRET is not set in environment variables");
        return Response.json(
          { success: false, error: "Server configuration error — contact admin" },
          { status: 500 }
        );
      }

      const auth = req.headers.get("authorization");

      if (!auth?.startsWith("Bearer ")) {
        return Response.json(
          { success: false, error: "No token provided" },
          { status: 401 }
        );
      }

      const token = auth.split(" ")[1];

      if (!token) {
        return Response.json(
          { success: false, error: "Token empty hai" },
          { status: 401 }
        );
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== "SuperAdmin") {
        return Response.json(
          { success: false, error: "Admin access required" },
          { status: 403 }
        );
      }

      req.admin = decoded;
      return handler(req, context);

    } catch (err) {
      if (err.name === "TokenExpiredError") {
        // ✅ FIX 3: TOKEN_EXPIRED code bhejo — client refresh karega
        return Response.json(
          { success: false, error: "Access token expire ho gaya", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }
      if (err.name === "JsonWebTokenError") {
        return Response.json(
          { success: false, error: "Invalid token — dobara login karo", code: "TOKEN_INVALID" },
          { status: 401 }
        );
      }
      console.error("Auth middleware error:", err.message);
      return Response.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }
  };
};

// ─────────────────────────────────────────────────────────────────
// verifyEmployee
// Employee routes ke liye — role must be "employee"
// ─────────────────────────────────────────────────────────────────
export const verifyEmployee = (handler) => {
  return async (req, context) => {
    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        console.error("CRITICAL: JWT_SECRET is not set in environment variables");
        return Response.json(
          { success: false, error: "Server configuration error — contact admin" },
          { status: 500 }
        );
      }

      const auth = req.headers.get("authorization");

      if (!auth?.startsWith("Bearer ")) {
        return Response.json(
          { success: false, error: "No token provided" },
          { status: 401 }
        );
      }

      const token = auth.split(" ")[1];

      if (!token) {
        return Response.json(
          { success: false, error: "Token empty hai" },
          { status: 401 }
        );
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role !== "employee") {
        return Response.json(
          { success: false, error: "Employee access required" },
          { status: 403 }
        );
      }

      req.employee = decoded;
      return handler(req, context);

    } catch (err) {
      if (err.name === "TokenExpiredError") {
        // ✅ FIX 3: TOKEN_EXPIRED code bhejo — client refresh karega
        return Response.json(
          { success: false, error: "Access token expire ho gaya", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }
      if (err.name === "JsonWebTokenError") {
        return Response.json(
          { success: false, error: "Invalid token", code: "TOKEN_INVALID" },
          { status: 401 }
        );
      }
      console.error("Employee auth middleware error:", err.message);
      return Response.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }
  };
};