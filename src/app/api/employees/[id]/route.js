// app/api/employees/[id]/route.js
import { connectDB }   from "@/lib/db";
import Employee        from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";
import { getEmpStats } from "@/app/api/employees/salaryUtils";

// ─────────────────────────────────────────────────────────────────
// GET  /api/employees/[id]
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const emp = await Employee.findById(id);
    if (!emp) {
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
    }

    const attendanceObj = emp.attendance instanceof Map
      ? Object.fromEntries(emp.attendance)
      : Object.fromEntries(Object.entries(emp.attendance || {}));
    const { present, halfDay, overtime, absent, totalEarned, paidAmount, dueAmount } = getEmpStats(emp);

    return Response.json({
      success: true,
      data: {
        ...emp.toObject(),
        attendance: attendanceObj,
        stats: {
          present,
          halfDay,
          overtime,
          absent,
          totalEarned,
          paidAmount,
          dueAmount,
          paidDays: 0,
          dueDays:  0,
        },
      },
    }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// PATCH  /api/employees/[id]
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
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
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