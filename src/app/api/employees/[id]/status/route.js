//app/api/employees/[id]/status/route.js
import { connectDB } from "@/lib/db";
import Employee from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────
// PATCH  /api/employees/[id]/status
// Toggle employee active ↔ inactive
// Body: { action: "deactivate" | "reactivate" }
//
// Deactivate:
//   - isActive = false
//   - deactivatedOn = today
//   - attendance lock ho jaata hai (handled on frontend + attendance route)
//
// Reactivate:
//   - isActive = true
//   - deactivatedOn = null
//   - auto-attendance dobara shuru ho jaata hai
//
// NOTE: Salary & attendance data kabhi delete nahi hota
// ─────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { action } = await req.json();

    if (!action || !["deactivate", "reactivate"].includes(action)) {
      return new Response(JSON.stringify({
        success: false,
        error: "action 'deactivate' ya 'reactivate' hona chahiye",
      }), { status: 400 });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return new Response(JSON.stringify({
        success: false,
        error: "Employee nahi mila",
      }), { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];

    if (action === "deactivate") {
      if (!employee.isActive) {
        return new Response(JSON.stringify({
          success: false,
          error: "Employee pehle se inactive hai",
        }), { status: 400 });
      }
      employee.isActive = false;
      employee.deactivatedOn = today;

    } else {
      // reactivate
      if (employee.isActive) {
        return new Response(JSON.stringify({
          success: false,
          error: "Employee pehle se active hai",
        }), { status: 400 });
      }
      employee.isActive = true;
      employee.deactivatedOn = null;
    }

    await employee.save();

    return new Response(JSON.stringify({
      success: true,
      message: action === "deactivate"
        ? `${employee.name} ko deactivate kar diya gaya. Salary & attendance record safe hai.`
        : `${employee.name} dobara active ho gaya. Auto-attendance shuru ho jayega.`,
      data: {
        _id:           employee._id,
        empId:         employee.empId,
        name:          employee.name,
        isActive:      employee.isActive,
        deactivatedOn: employee.deactivatedOn,
      },
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});