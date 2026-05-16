// app/api/employees/[id]/salary/pay/route.js
import { connectDB }                        from "@/lib/db";
import Employee                             from "@/app/api/employees/models/Employee";
import { verifyAdmin }                      from "@/app/api/middleware/auth";
import { getSalaryForDate, getEmpStats }    from "@/app/api/employees/salaryUtils";

const getAttObj = (emp) =>
  emp.attendance instanceof Map
    ? Object.fromEntries(emp.attendance)
    : (emp.attendance || {});

// ─────────────────────────────────────────────────────────────────
// PATCH  /api/employees/[id]/salary/pay
// ─────────────────────────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { amount, note } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return Response.json(
        { success: false, error: "Amount required hai aur zero se zyada hona chahiye" },
        { status: 400 }
      );
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
    }
    const { totalEarned } = getEmpStats(employee);

    const totalAlreadyPaid = (employee.salaryPayments || [])
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalDue = totalEarned - totalAlreadyPaid;

    if (totalDue <= 0) {
      return Response.json(
        { success: false, error: "Koi bhi salary due nahi hai — poora pay ho chuka hai" },
        { status: 400 }
      );
    }

    const payAmount = Number(amount);
    if (payAmount > totalDue) {
      return Response.json(
        { success: false, error: `Payment ₹${payAmount} due amount ₹${Math.round(totalDue)} se zyada nahi ho sakta` },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const newPayment = {
      amount:  payAmount,
      paidOn:  today,
      note:    note?.trim() || `₹${payAmount.toLocaleString("en-IN")} payment`,
      dates:   [],
    };

    employee.salaryPayments.push(newPayment);
    await employee.save();

    const newTotalPaid = totalAlreadyPaid + payAmount;
    const newDue       = totalEarned - newTotalPaid;

    return Response.json({
      success: true,
      message: `₹${payAmount.toLocaleString("en-IN")} salary paid ho gaya`,
      data: {
        payment:       newPayment,
        totalEarned:   Math.round(totalEarned),
        totalPaid:     Math.round(newTotalPaid),
        remainingDue:  Math.round(Math.max(0, newDue)),
        paymentsCount: employee.salaryPayments.length,
      },
    }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET  /api/employees/[id]/salary/pay
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    const employee = await Employee.findById(id);
    if (!employee) {
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
    }

    const attObj = getAttObj(employee);

    // Month filter apply karo
    const filteredEntries = Object.entries(attObj).filter(
      ([date]) => (month ? date.startsWith(month) : true)
    );

    const presentDays = filteredEntries
      .filter(([, v]) => {
        const s = typeof v === "string" ? v : v?.status;
        return s === "present" || s === "auto-present";
      })
      .map(([date]) => date)
      .sort((a, b) => new Date(b) - new Date(a));

    const halfDayDates = filteredEntries
      .filter(([, v]) => (typeof v === "string" ? v : v?.status) === "half-day")
      .map(([date]) => date)
      .sort((a, b) => new Date(b) - new Date(a));

    const overtimeDates = filteredEntries
      .filter(([, v]) => (typeof v === "string" ? v : v?.status) === "overtime")
      .map(([date]) => date)
      .sort((a, b) => new Date(b) - new Date(a));

    const absentDays = filteredEntries
      .filter(([, v]) => (typeof v === "string" ? v : v?.status) === "absent")
      .map(([date]) => date)
      .sort((a, b) => new Date(b) - new Date(a));
    const allFilteredDates = filteredEntries
      .filter(([, v]) => {
        const s = typeof v === "string" ? v : v?.status;
        return s !== "absent";
      })
      .map(([date]) => date);

    const totalEarned = allFilteredDates.reduce(
      (sum, date) => sum + getSalaryForDate(date, employee),
      0
    );

    const allPayments = employee.salaryPayments || [];
    const totalPaid   = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalDue    = Math.max(0, totalEarned - totalPaid);

    const filteredPmts = month
      ? allPayments.filter((p) => p.paidOn?.startsWith(month))
      : allPayments;

    return Response.json({
      success: true,
      data: {
        perDaySalary: employee.perDaySalary,
        summary: {
          presentDays:  presentDays.length,
          halfDayDays:  halfDayDates.length,
          overtimeDays: overtimeDates.length,
          absentDays:   absentDays.length,
          totalEarned:  Math.round(totalEarned),
          totalPaid:    Math.round(totalPaid),
          totalDue:     Math.round(totalDue),
        },
        presentDatesList:  presentDays,
        halfDayDatesList:  halfDayDates,
        overtimeDatesList: overtimeDates,
        absentDatesList:   absentDays,
        payments: [...filteredPmts].reverse(),
      },
    }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});