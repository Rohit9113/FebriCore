//app/api/employees/[id]/attendance/route.js
import { connectDB } from "@/lib/db";
import Employee from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

const TODAY = () => new Date().toISOString().split("T")[0];

export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { date, status, superAdmin } = await req.json();

    // ── Validate inputs ───────────────────────
    if (!date || !status) {
      return new Response(JSON.stringify({
        success: false,
        error: "date aur status required hain",
      }), { status: 400 });
    }

    const validStatuses = ["present", "absent"];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({
        success: false,
        error: "status sirf 'present' ya 'absent' ho sakta hai",
      }), { status: 400 });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return new Response(JSON.stringify({
        success: false,
        error: "Employee nahi mila",
      }), { status: 404 });
    }

    const today = TODAY();
    const isToday = date === today;
    const existingEntry = employee.attendance.get(date);

    // ── NORMAL MODE: strict locking rules ────
    if (!superAdmin) {
      // Only today's date allowed
      if (!isToday) {
        return new Response(JSON.stringify({
          success: false,
          error: "Normal mode mein sirf aaj ka attendance mark ho sakta hai",
        }), { status: 403 });
      }

      // If already manually marked (not auto), it can still be re-marked today
      // (today is always editable — it's only past manual days that are locked)
    }

    // ── SUPER ADMIN MODE: any date editable ──
    // No additional checks — admin can change anything

    // ── Apply the change ──────────────────────
    employee.attendance.set(date, {
      status,
      markedBy: "manual",
    });

    await employee.save();

    return new Response(JSON.stringify({
      success: true,
      message: superAdmin
        ? `Admin override: ${date} → ${status}`
        : `Aaj (${date}) ka attendance ${status} mark ho gaya`,
      data: {
        date,
        status,
        markedBy: "manual",
        superAdmin: !!superAdmin,
      },
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});

// ─────────────────────────────────────────────
// POST  /api/employees/[id]/attendance
// Auto-mark attendance as "auto-present" for today
// Called by the server's midnight scheduler
// Only marks if today's date is not already recorded
// ─────────────────────────────────────────────
export const POST = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return new Response(JSON.stringify({
        success: false,
        error: "Employee nahi mila",
      }), { status: 404 });
    }

    if (!employee.isActive) {
      return new Response(JSON.stringify({
        success: false,
        error: "Inactive employee ka auto-attendance nahi ho sakta",
      }), { status: 400 });
    }

    const today = TODAY();
    const alreadyMarked = employee.attendance.get(today);

    if (alreadyMarked) {
      return new Response(JSON.stringify({
        success: false,
        message: "Aaj ka attendance pehle se mark hai",
        data: { date: today, ...alreadyMarked },
      }), { status: 200 });
    }

    employee.attendance.set(today, {
      status: "auto-present",
      markedBy: "auto",
    });

    await employee.save();

    return new Response(JSON.stringify({
      success: true,
      message: `Auto-present mark ho gaya: ${today}`,
      data: { date: today, status: "auto-present", markedBy: "auto" },
    }), { status: 201 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});