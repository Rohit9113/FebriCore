//app/api/employees/[id]/salary/pay/route.js
import { connectDB } from "@/lib/db";
import Employee from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────
// PATCH  /api/employees/[id]/salary/pay
//
// Amount-based partial payment support
// Body: { amount, note? }
//
// Rules:
//   - amount > 0 required
//   - amount <= totalDueAmount (can't overpay)
//   - Records in salaryPayments log
//   - Due = totalEarned - sum(salaryPayments[].amount)
// ─────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { amount, note } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Amount required hai aur zero se zyada hona chahiye",
      }), { status: 400 });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return new Response(JSON.stringify({
        success: false,
        error: "Employee nahi mila",
      }), { status: 404 });
    }

    const attendanceObj = employee.attendance instanceof Map
      ? Object.fromEntries(employee.attendance)
      : (employee.attendance || {});

    const presentDays = Object.values(attendanceObj).filter(
      (v) => v.status === "present" || v.status === "auto-present"
    ).length;

    const totalEarned = presentDays * employee.perDaySalary;
    const totalAlreadyPaid = (employee.salaryPayments || [])
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalDue = totalEarned - totalAlreadyPaid;

    if (totalDue <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Koi bhi salary due nahi hai — poora pay ho chuka hai",
      }), { status: 400 });
    }

    const payAmount = Number(amount);

    if (payAmount > totalDue) {
      return new Response(JSON.stringify({
        success: false,
        error: `Payment ₹${payAmount} due amount ₹${totalDue} se zyada nahi ho sakta`,
      }), { status: 400 });
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

    return new Response(JSON.stringify({
      success: true,
      message: `₹${payAmount.toLocaleString("en-IN")} salary paid ho gaya`,
      data: {
        payment:       newPayment,
        totalEarned,
        totalPaid:     newTotalPaid,
        remainingDue:  newDue,
        presentDays,
        paymentsCount: employee.salaryPayments.length,
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
// GET  /api/employees/[id]/salary/pay
// Get salary summary — earned, paid, due
// Optional: ?month=2025-09
// ─────────────────────────────────────────────
export const GET = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const employee = await Employee.findById(id);
    if (!employee) {
      return new Response(JSON.stringify({
        success: false,
        error: "Employee nahi mila",
      }), { status: 404 });
    }

    const attendanceObj = employee.attendance instanceof Map
      ? Object.fromEntries(employee.attendance)
      : (employee.attendance || {});

    const filteredEntries = Object.entries(attendanceObj).filter(
      ([date]) => (month ? date.startsWith(month) : true)
    );

    const presentDays = filteredEntries
      .filter(([, v]) => v.status === "present" || v.status === "auto-present")
      .map(([date]) => date)
      .sort((a, b) => new Date(b) - new Date(a));

    const absentDays = filteredEntries
      .filter(([, v]) => v.status === "absent")
      .map(([date]) => date)
      .sort((a, b) => new Date(b) - new Date(a));

    const totalEarned = presentDays.length * employee.perDaySalary;
    const allPayments  = employee.salaryPayments || [];
    const totalPaid    = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalDue     = Math.max(0, totalEarned - totalPaid);

    const filteredPmts = month
      ? allPayments.filter((p) => p.paidOn?.startsWith(month))
      : allPayments;

    return new Response(JSON.stringify({
      success: true,
      data: {
        perDaySalary: employee.perDaySalary,
        summary: {
          presentDays:     presentDays.length,
          absentDays:      absentDays.length,
          totalEarned,
          totalPaid,
          totalDue,
        },
        presentDatesList: presentDays,
        absentDatesList:  absentDays,
        payments: [...filteredPmts].reverse(),
      },
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});