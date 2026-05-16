// app/api/employees/[id]/attendance/route.js
import { connectDB }   from "@/lib/db";
import Employee        from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

const VALID_STATUSES = ["present", "absent", "auto-present", "half-day", "overtime"];
const TODAY = () => new Date().toISOString().split("T")[0];

export const PATCH = verifyAdmin(async (req, { params }) => {
  try {
    await connectDB();

    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json(
        { success: false, error: "Request body invalid hai" },
        { status: 400 }
      );
    }

    const { date, status, superAdmin, overtimeHours, overtimeAmount } = body;

    if (!date || !status) {
      return Response.json(
        { success: false, error: "date aur status dono required hain" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return Response.json(
        { success: false, error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (date !== TODAY() && !superAdmin) {
      return Response.json(
        { success: false, error: "Sirf aaj ka attendance mark kar sakte ho" },
        { status: 403 }
      );
    }

    let validOTHours  = 0;
    let validOTAmount = 0;

    if (status === "overtime") {
      validOTAmount = Math.max(0, Number(overtimeAmount) || 0);
      validOTHours  = Math.max(0, Number(overtimeHours)  || 0);

      if (validOTAmount <= 0 && validOTHours <= 0) {
        return Response.json(
          { success: false, error: "Overtime ke liye amount ya hours mein se koi ek zaroori hai" },
          { status: 400 }
        );
      }
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
    }

    if (!employee.isActive && !superAdmin) {
      return Response.json(
        { success: false, error: "Inactive employee ka attendance mark nahi kar sakte" },
        { status: 403 }
      );
    }

    employee.attendance.set(date, {
      status,
      markedBy:       superAdmin ? "superAdmin" : "manual",
      overtimeHours:  validOTHours,
      overtimeAmount: validOTAmount,
    });

    employee.markModified("attendance");
    await employee.save();

    return Response.json({
      success: true,
      data: { date, status, overtimeHours: validOTHours, overtimeAmount: validOTAmount },
    });

  } catch (err) {
    console.error("Attendance PATCH error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});

export const POST = verifyAdmin(async (req, { params }) => {
  try {
    await connectDB();

    const { id } = await params;
    const today  = TODAY();

    const employee = await Employee.findById(id);
    if (!employee || !employee.isActive) {
      return Response.json(
        { success: false, error: "Employee nahi mila ya inactive hai" },
        { status: 404 }
      );
    }

    if (employee.attendance.has(today)) {
      return Response.json({ success: true, data: { skipped: true } });
    }

    employee.attendance.set(today, {
      status:         "auto-present",
      markedBy:       "auto",
      overtimeHours:  0,
      overtimeAmount: 0,
    });

    employee.markModified("attendance");
    await employee.save();

    return Response.json({
      success: true,
      data: { date: today, status: "auto-present", markedBy: "auto" },
    });

  } catch (err) {
    console.error("Attendance POST error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});