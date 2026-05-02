// app/api/employees/[id]/route.js

import { connectDB }   from "@/lib/db";
import Employee        from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─── Helper ───────────────────────────────────────────────────────
const getSalaryForDate = (date, salaryHistory, perDaySalary) => {
  if (!salaryHistory || salaryHistory.length === 0) return perDaySalary;
  const applicable = salaryHistory
    .filter((h) => h.from <= date)
    .sort((a, b) => new Date(b.from) - new Date(a.from));
  return applicable.length > 0 ? applicable[0].salary : perDaySalary;
};

// ─────────────────────────────────────────────────────────────────
// GET  /api/employees/[id]
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const emp = await Employee.findById(id);
    if (!emp) {
      return Response.json({ success: false, error: "Employee nahi mila" }, { status: 404 });
    }

    const attendanceObj = emp.attendance instanceof Map
      ? Object.fromEntries(emp.attendance)
      : Object.fromEntries(Object.entries(emp.attendance || {}));

    const entries = Object.entries(attendanceObj);

    const presentEntries = entries.filter(
      ([, v]) => v.status === "present" || v.status === "auto-present"
    );
    const absentCount = entries.filter(([, v]) => v.status === "absent").length;

    // ✅ FIX: per-date salary
    const totalEarned = presentEntries.reduce(
      (sum, [date]) => sum + getSalaryForDate(date, emp.salaryHistory, emp.perDaySalary),
      0
    );

    const totalPaid = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const dueAmount = Math.max(0, totalEarned - totalPaid);

    return Response.json({
      success: true,
      data: {
        ...emp.toObject(),
        attendance: attendanceObj,
        stats: {
          present:     presentEntries.length,
          absent:      absentCount,
          totalEarned: Math.round(totalEarned),
          paidAmount:  Math.round(totalPaid),
          dueAmount:   Math.round(dueAmount),
          paidDays:    0,
          dueDays:     0,
        },
      },
    }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────
// PATCH  /api/employees/[id]
// Update: name, phone, address
// ─────────────────────────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const body          = await req.json();
    const allowedFields = ["name", "phone", "address"];
    const updates       = {};

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field];
    });

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { success: false, error: "Koi valid update field nahi mila" },
        { status: 400 }
      );
    }

    if (updates.phone) {
      const duplicate = await Employee.findOne({ phone: updates.phone, _id: { $ne: id } });
      if (duplicate) {
        return Response.json(
          { success: false, error: "Yeh phone number doosre employee ke paas already hai" },
          { status: 409 }
        );
      }
    }

    const updated = await Employee.findByIdAndUpdate(
      id, { $set: updates }, { new: true, runValidators: true }
    );

    if (!updated) {
      return Response.json({ success: false, error: "Employee nahi mila" }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "Employee profile update ho gaya",
      data:    updated,
    }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});