// app/api/admin/login/route.js
import { connectDB }                                    from "@/lib/db";
import Admin                                            from "@/app/api/admin/model";
import bcrypt                                           from "bcryptjs";
import { generateAccessToken, generateRefreshToken }    from "@/app/api/middleware/auth";

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

    const admin = await Admin.findOne({ phone }).select("+password");

    if (!admin) {
      return Response.json(
        { success: false, error: "Admin not found." },
        { status: 404 }
      );
    }

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

    // ✅ BUG 1 FIX: generateAccessToken + generateRefreshToken use karo
    // Pehle: jwt.sign({...}, JWT_SECRET, { expiresIn: "7d" }) — hardcoded, dead code bypass
    // Ab: shared functions use hote hain — consistent expiry across app
    const tokenPayload = {
      _id:   admin._id,
      name:  admin.name,
      phone: admin.phone,
      email: admin.email,
      role:  admin.role,
    };

    const accessToken  = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return Response.json({
      success: true,
      data: {
        token:        accessToken,   
        refreshToken,
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