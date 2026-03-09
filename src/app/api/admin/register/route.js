// app/api/admin/register/route.js
import { registerAdmin } from "../controllers";

export async function POST(req) {
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
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
