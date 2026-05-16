// app/api/admin/register/route.js
import { registerAdmin } from "../controllers";

export async function POST(req) {
  const registrationEnabled =
    process.env.ADMIN_REGISTRATION_ENABLED === "true";

  if (!registrationEnabled) {
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