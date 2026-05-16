// app/api/middleware/auth.js
import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_EXPIRY  = "15m";
export const REFRESH_TOKEN_EXPIRY = "7d";
export const generateAccessToken = (payload) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = (payload) => {
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
  if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET not set");
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