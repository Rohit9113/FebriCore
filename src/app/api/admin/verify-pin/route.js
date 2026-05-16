// app/api/admin/verify-pin/route.js
import { verifyAdmin } from "@/app/api/middleware/auth";

export const POST = verifyAdmin(async (req) => {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return Response.json(
        { success: false, error: "PIN required hai" },
        { status: 400 }
      );
    }

    const SUPER_ADMIN_PIN = process.env.SUPER_ADMIN_PIN;

    if (!SUPER_ADMIN_PIN) {
      console.error("SUPER_ADMIN_PIN not set in .env.local");
      return Response.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (pin !== SUPER_ADMIN_PIN) {
      return Response.json(
        { success: false, error: "Galat PIN" },
        { status: 403 }
      );
    }
    return Response.json({
      success: true,
      message: "PIN verified",
    }, { status: 200 });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});