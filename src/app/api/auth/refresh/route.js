// app/api/auth/refresh/route.js
import { connectDB }                              from "@/lib/db";
import Admin                                      from "@/app/api/admin/model";
import Employee                                   from "@/app/api/employees/models/Employee";
import { verifyRefreshToken, generateAccessToken } from "@/app/api/middleware/auth";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.refreshToken) {
      return Response.json(
        { success: false, error: "Refresh token required hai" },
        { status: 400 }
      );
    }

    const { refreshToken } = body;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return Response.json(
          {
            success: false,
            error:   "Session expire ho gaya — dobara login karo",
            code:    "REFRESH_EXPIRED",
          },
          { status: 401 }
        );
      }
      return Response.json(
        {
          success: false,
          error:   "Invalid refresh token — dobara login karo",
          code:    "REFRESH_INVALID",
        },
        { status: 401 }
      );
    }

    await connectDB();

    let newPayload;

    if (decoded.role === "SuperAdmin") {
      const admin = await Admin.findById(decoded._id).select("_id name phone email role");
      if (!admin) {
        return Response.json(
          { success: false, error: "Admin account nahi mila", code: "USER_NOT_FOUND" },
          { status: 404 }
        );
      }

      newPayload = {
        _id:   admin._id,
        name:  admin.name,
        phone: admin.phone,
        email: admin.email,
        role:  admin.role,
      };

    } else if (decoded.role === "employee") {
      const emp = await Employee.findById(decoded._id).select("_id empId name phone isActive");
      if (!emp) {
        return Response.json(
          { success: false, error: "Employee account nahi mila", code: "USER_NOT_FOUND" },
          { status: 404 }
        );
      }

      if (!emp.isActive) {
        return Response.json(
          {
            success: false,
            error:   "Aapka account deactivate ho gaya — admin se baat karo",
            code:    "ACCOUNT_DEACTIVATED",
          },
          { status: 403 }
        );
      }

      newPayload = {
        _id:   emp._id,
        empId: emp.empId,
        name:  emp.name,
        phone: emp.phone,
        role:  "employee",
      };

    } else {
      return Response.json(
        { success: false, error: "Invalid token role", code: "INVALID_ROLE" },
        { status: 401 }
      );
    }

    const newAccessToken = generateAccessToken(newPayload);

    return Response.json({
      success:     true,
      accessToken: newAccessToken,
    }, { status: 200 });

  } catch (err) {
    console.error("Refresh token error:", err);
    return Response.json(
      { success: false, error: "Server error — dobara try karo" },
      { status: 500 }
    );
  }
}