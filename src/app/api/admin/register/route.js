// app/api/admin/register/route.js
//
// ✅ FIX 22: Route ab env variable se disable hoti hai
//
// Problem pehle:
//   /api/admin/register hamesha publicly accessible tha
//   SuperAdmin ban jaane ke baad bhi koi bhi POST kar sakta tha
//   Agar registerAdmin() mein koi bug aata toh second admin ban sakta tha
//
// Solution:
//   ADMIN_REGISTRATION_ENABLED=true  → route kaam karti hai  (setup ke waqt)
//   ADMIN_REGISTRATION_ENABLED=false → 404 milta hai          (production mein)
//   Value missing ho                 → 404 milta hai          (safe default)
//
// .env.local mein add karo:
//   ADMIN_REGISTRATION_ENABLED=true   ← pehli baar setup ke liye
//
// SuperAdmin ban jaane ke baad .env.local se yeh line hata do
// ya value false kar do — route permanently band ho jaayega

import { registerAdmin } from "../controllers";

export async function POST(req) {

  // ✅ FIX: Env check — missing ya "false" dono pe 404
  // process.env server-side pe available hai — browser tak kabhi nahi jaata
  const registrationEnabled =
    process.env.ADMIN_REGISTRATION_ENABLED === "true";

  if (!registrationEnabled) {
    // ✅ 404 return karo — 403 nahi
    // 403 se attacker ko pata chalega ki route exist karta hai
    // 404 se lagega route hi nahi hai — security through obscurity
    return Response.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();

    const { name, phone, email, password } = body;

    // Basic validation
    if (!name || !phone || !email || !password) {
      return Response.json(
        { success: false, error: "All fields are required." },
        { status: 400 }
      );
    }

    const admin = await registerAdmin({ name, phone, email, password });

    return Response.json({ success: true, data: admin });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}