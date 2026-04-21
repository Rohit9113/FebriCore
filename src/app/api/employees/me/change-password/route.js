// app/api/employees/me/change-password/route.js
//
// ✅ NEW: Employee apna password khud change kar sakta hai
//
// Flow:
//   1. Employee apna current password enter karta hai (verify)
//   2. Naya password enter karta hai (min 6 chars)
//   3. Confirm password match check
//   4. Hash karke save karo
//
// Security:
//   - verifyEmployee middleware — sirf logged in employee apna password change kar sakta hai
//   - Current password verify hota hai pehle — unauthorized change impossible
//   - Naya password minimum 6 characters

import { connectDB }      from "@/lib/db";
import Employee           from "@/app/api/employees/models/Employee";
import { verifyEmployee } from "@/app/api/middleware/auth";
import bcrypt             from "bcryptjs";

export const PATCH = verifyEmployee(async (req) => {
  try {
    await connectDB();

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    // ── Validation ────────────────────────────────────────────────
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Response.json(
        { success: false, error: "Teeno fields required hain" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return Response.json(
        { success: false, error: "Naya password aur confirm password match nahi kar rahe" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { success: false, error: "Naya password kam se kam 6 characters ka hona chahiye" },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return Response.json(
        { success: false, error: "Naya password purane password se alag hona chahiye" },
        { status: 400 }
      );
    }

    // ── Employee fetch with password ──────────────────────────────
    const emp = await Employee
      .findById(req.employee._id)
      .select("+password");

    if (!emp) {
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
    }

    if (!emp.isActive) {
      return Response.json(
        { success: false, error: "Account deactivate hai — admin se baat karo" },
        { status: 403 }
      );
    }

    // ── Verify current password ───────────────────────────────────
    const isMatch = await bcrypt.compare(currentPassword, emp.password);
    if (!isMatch) {
      return Response.json(
        { success: false, error: "Current password galat hai" },
        { status: 401 }
      );
    }

    // ── Hash new password and save ────────────────────────────────
    const hashed = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    emp.password = hashed;
    await emp.save();

    return Response.json({
      success: true,
      message: "Password successfully change ho gaya — agli baar naye password se login karo",
    }, { status: 200 });

  } catch (err) {
    console.error("Change password error:", err);
    return Response.json(
      { success: false, error: "Kuch galat hua — dobara try karo" },
      { status: 500 }
    );
  }
});