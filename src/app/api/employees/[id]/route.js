// app/api/employees/[id]/route.js
// ✅ FIX: Salary calculation — paidDates se nahi, salaryPayments amount se
// ✅ FIX: dueAmount = totalEarned - sum(salaryPayments[].amount)

import { connectDB }  from "@/lib/db";
import Employee       from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// GET  /api/employees/[id]
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const emp = await Employee.findById(id);
    if (!emp) {
      return new Response(JSON.stringify({
        success: false,
        error: "Employee nahi mila",
      }), { status: 404 });
    }

    // ✅ FIX: Map → plain object
    const attendanceObj = emp.attendance instanceof Map
      ? Object.fromEntries(emp.attendance)
      : (emp.attendance
          ? Object.fromEntries(Object.entries(emp.attendance))
          : {});

    const entries      = Object.values(attendanceObj);
    const presentCount = entries.filter(
      (v) => v.status === "present" || v.status === "auto-present"
    ).length;
    const absentCount  = entries.filter((v) => v.status === "absent").length;

    // ✅ FIX: Amount-based calculation (paidDates wala purana system hataya)
    const totalEarned = presentCount * emp.perDaySalary;
    const totalPaid   = (emp.salaryPayments || []).reduce(
      (s, p) => s + (p.amount || 0), 0
    );
    const dueAmount   = Math.max(0, totalEarned - totalPaid);

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...emp.toObject(),
        attendance: attendanceObj,
        stats: {
          present:     presentCount,
          absent:      absentCount,
          totalEarned,
          paidAmount:  totalPaid,
          dueAmount,
          // Keep for backward compat
          paidDays:    0,
          dueDays:     0,
        },
      },
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
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
      return new Response(JSON.stringify({
        success: false,
        error: "Koi valid update field nahi mila",
      }), { status: 400 });
    }

    // Phone duplicate check
    if (updates.phone) {
      const duplicate = await Employee.findOne({
        phone: updates.phone,
        _id:   { $ne: id },
      });
      if (duplicate) {
        return new Response(JSON.stringify({
          success: false,
          error: "Yeh phone number doosre employee ke paas already hai",
        }), { status: 409 });
      }
    }

    const updated = await Employee.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return new Response(JSON.stringify({
        success: false,
        error: "Employee nahi mila",
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Employee profile update ho gaya",
      data:    updated,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});