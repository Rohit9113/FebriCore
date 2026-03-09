//app/api/employees/[id]/salary/route.js
import { connectDB } from "@/lib/db";
import Employee from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────
// PATCH  /api/employees/[id]/salary
// Update per-day salary (increment / change)
// Body: { newSalary, effectiveDate, reason? }
// ─────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { newSalary, effectiveDate, reason } = await req.json();

    if (!newSalary || !effectiveDate) {
      return new Response(JSON.stringify({
        success: false,
        error: "newSalary aur effectiveDate required hain",
      }), { status: 400 });
    }

    if (Number(newSalary) <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Salary zero ya negative nahi ho sakti",
      }), { status: 400 });
    }

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
        error: "Inactive employee ki salary update nahi ho sakti",
      }), { status: 400 });
    }

    const oldSalary = employee.perDaySalary;

    // Push to salary history
    employee.salaryHistory.push({
      salary: Number(newSalary),
      from: effectiveDate,
      reason: reason || "Salary Update",
    });

    employee.perDaySalary = Number(newSalary);

    await employee.save();

    return new Response(JSON.stringify({
      success: true,
      message: `Salary ₹${oldSalary} se ₹${newSalary} ho gaya`,
      data: {
        oldSalary,
        newSalary: Number(newSalary),
        effectiveDate,
        reason: reason || "Salary Update",
        salaryHistory: employee.salaryHistory,
      },
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});