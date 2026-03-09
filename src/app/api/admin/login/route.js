//app/api/admin/login/route.js
import { connectDB } from "@/lib/db";
import Admin from "@/app/api/admin/model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not set in .env.local");
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { phone, password } = body;

    // 1️⃣ Validate input
    if (!phone || !password) {
      return Response.json(
        { success: false, error: "Phone and password are required." },
        { status: 400 }
      );
    }

    // 2️⃣ Find admin by phone
    const admin = await Admin.findOne({ phone });
    if (!admin) {
      return Response.json(
        { success: false, error: "Admin not found." },
        { status: 404 }
      );
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return Response.json(
        { success: false, error: "Invalid phone or password." },
        { status: 401 }
      );
    }

    // 4️⃣ Generate JWT token
    const token = jwt.sign(
      {
        _id: admin._id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5️⃣ Return all admin details
    return Response.json({
      success: true,
      data: {
        token,
        admin: {
          _id: admin._id,
          name: admin.name,
          phone: admin.phone,
          email: admin.email,
          role: admin.role,
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
