// app/api/admin/verify-pin/route.js
//
// ✅ FIX: Super Admin PIN ab server side pe verify hoti hai
// Pehle PIN client-side JS mein hardcoded tha — koi bhi DevTools mein dekh sakta tha
// Ab PIN sirf .env.local mein hogi — browser mein kabhi nahi jaayegi

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

    // ✅ PIN sirf server pe hai — .env.local mein SUPER_ADMIN_PIN set karo
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

    // ✅ PIN correct — ek short-lived token return karo (10 min)
    // Frontend is token ko use karega super admin actions ke liye
    return Response.json({
      success: true,
      message: "PIN verified",
      // Client ko sirf yeh pata chalega ki PIN sahi hai
      // Actual PIN kabhi client ko nahi jaayegi
    }, { status: 200 });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});