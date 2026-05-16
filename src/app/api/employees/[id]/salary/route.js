// app/api/employees/[id]/salary/route.js
import { connectDB }   from "@/lib/db";
import Employee        from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { newSalary, effectiveDate, reason } = await req.json();

    if (!newSalary || !effectiveDate) {
      return Response.json(
        { success: false, error: "newSalary aur effectiveDate required hain" },
        { status: 400 }
      );
    }

    if (Number(newSalary) <= 0) {
      return Response.json(
        { success: false, error: "Salary zero ya negative nahi ho sakti" },
        { status: 400 }
      );
    }

    const emp = await Employee.findById(id);
    if (!emp) {
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
    }
    if (emp.salaryHistory.length === 0) {
      emp.salaryHistory.push({
        salary: emp.perDaySalary,
        from:   emp.joiningDate,
        reason: "Initial Salary",
      });
    }
    const existingIdx = emp.salaryHistory.findIndex(h => h.from === effectiveDate);
    if (existingIdx !== -1) {
      emp.salaryHistory[existingIdx].salary = Number(newSalary);
      emp.salaryHistory[existingIdx].reason  = reason || "Salary Update";
    } else {
      emp.salaryHistory.push({
        salary: Number(newSalary),
        from:   effectiveDate,
        reason: reason || "Salary Update",
      });
    }

    // ── Sort by date — oldest first ────────────────────────────────
    emp.salaryHistory.sort((a, b) => new Date(a.from) - new Date(b.from));
    emp.markModified("salaryHistory");

    // ── Current salary update karo ─────────────────────────────────
    emp.perDaySalary = Number(newSalary);

    await emp.save();

    return Response.json({
      success: true,
      message: `${emp.name} ki salary ₹${newSalary}/day ho gayi (from ${effectiveDate})`,
      data: {
        _id:          emp._id,
        name:         emp.name,
        perDaySalary: emp.perDaySalary,
        salaryHistory: emp.salaryHistory,
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Salary update error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});