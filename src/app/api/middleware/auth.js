import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// ─────────────────────────────────────────────────────────────────
// verifyAdmin
// Admin routes ke liye — role must be "SuperAdmin"
// Usage: export const GET = verifyAdmin(async (req) => { ... })
// req.admin = { _id, name, phone, role }
// ─────────────────────────────────────────────────────────────────
export const verifyAdmin = (handler) => {
  return async (req, context) => {
    try {
      const auth = req.headers.get("authorization");

      if (!auth?.startsWith("Bearer ")) {
        return Response.json(
          { success: false, error: "No token provided" },
          { status: 401 }
        );
      }

      const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);

      if (decoded.role !== "SuperAdmin") {
        return Response.json(
          { success: false, error: "Admin access required" },
          { status: 403 }
        );
      }

      req.admin = decoded;
      return handler(req, context);

    } catch (err) {
      return Response.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }
  };
};

// ─────────────────────────────────────────────────────────────────
// verifyEmployee
// Employee routes ke liye — role must be "employee"
// Usage: export const GET = verifyEmployee(async (req) => { ... })
// req.employee = { _id, empId, name, phone, role }
// ─────────────────────────────────────────────────────────────────
export const verifyEmployee = (handler) => {
  return async (req, context) => {
    try {
      const auth = req.headers.get("authorization");

      if (!auth?.startsWith("Bearer ")) {
        return Response.json(
          { success: false, error: "No token provided" },
          { status: 401 }
        );
      }

      const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);

      if (decoded.role !== "employee") {
        return Response.json(
          { success: false, error: "Employee access required" },
          { status: 403 }
        );
      }

      req.employee = decoded;
      return handler(req, context);

    } catch (err) {
      return Response.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }
  };
};