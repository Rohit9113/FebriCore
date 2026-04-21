// app/api/admin/login/route.js
import { connectDB } from "@/lib/db";
import Admin         from "@/app/api/admin/model";
import bcrypt        from "bcryptjs";
import jwt           from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json(
        { success: false, error: "Request body invalid hai" },
        { status: 400 }
      );
    }

    const { phone, password } = body;

    if (!phone || !password) {
      return Response.json(
        { success: false, error: "Phone and password are required." },
        { status: 400 }
      );
    }

    // ✅ FIX: .select("+password") — select:false override karo
    // Pehle: Admin.findOne({ phone }) → password undefined → bcrypt crash
    // Ab: password explicitly select hoga
    const admin = await Admin.findOne({ phone }).select("+password");

    if (!admin) {
      return Response.json(
        { success: false, error: "Admin not found." },
        { status: 404 }
      );
    }

    // ✅ Extra check: password field exist karta hai?
    if (!admin.password) {
      console.error("Admin password field missing for:", phone);
      return Response.json(
        { success: false, error: "Account setup incomplete — contact support." },
        { status: 500 }
      );
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return Response.json(
        { success: false, error: "Invalid phone or password." },
        { status: 401 }
      );
    }

    // ✅ JWT_SECRET runtime check
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("CRITICAL: JWT_SECRET missing");
      return Response.json(
        { success: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        _id:   admin._id,
        name:  admin.name,
        phone: admin.phone,
        email: admin.email,
        role:  admin.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return Response.json({
      success: true,
      data: {
        token,
        admin: {
          _id:       admin._id,
          name:      admin.name,
          phone:     admin.phone,
          email:     admin.email,
          role:      admin.role,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
      },
    });

  } catch (err) {
    console.error("Login Error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}