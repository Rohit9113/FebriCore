import { connectDB }      from "@/lib/db";
import Employee           from "@/app/api/employees/models/Employee";
import { verifyEmployee } from "@/app/api/middleware/auth";

export const GET = verifyEmployee(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM" or null

    const emp = await Employee.findById(req.employee._id);

    if (!emp) {
      return Response.json(
        { success: false, error: "Employee nahi mila" },
        { status: 404 }
      );
    }

    // ── FIX 3: Token valid hai lekin baad mein admin ne deactivate
    // kar diya — token ka sirf expiry check kafi nahi, DB status bhi check karo
    if (!emp.isActive) {
      return Response.json(
        { success: false, error: "Account deactivate hai — admin se baat karo" },
        { status: 403 }
      );
    }

    // ── Attendance Map → plain object ────────────────────────────
    const attObj = emp.attendance instanceof Map
      ? Object.fromEntries(emp.attendance)
      : Object.fromEntries(Object.entries(emp.attendance || {}));

    const allEntries = Object.entries(attObj);
    const entries    = month
      ? allEntries.filter(([date]) => date.startsWith(month))
      : allEntries;

    const presentDays = entries
      .filter(([, v]) => v.status === "present" || v.status === "auto-present")
      .map(([d]) => d)
      .sort((a, b) => (a < b ? 1 : -1));

    const absentDays = entries
      .filter(([, v]) => v.status === "absent")
      .map(([d]) => d)
      .sort((a, b) => (a < b ? 1 : -1));

    // ── Salary — always on FULL data ─────────────────────────────
    const allValues    = Object.values(attObj);
    const totalPresent = allValues.filter(
      (v) => v.status === "present" || v.status === "auto-present"
    ).length;

    const allPayments = emp.salaryPayments || [];
    const totalPaid   = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalEarned = totalPresent * emp.perDaySalary;
    const totalDue    = Math.max(0, totalEarned - totalPaid);

    const monthPayments = month
      ? allPayments.filter((p) => p.paidOn?.startsWith(month))
      : allPayments;

    const monthEarned = presentDays.length * emp.perDaySalary;
    const monthPaid   = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const monthDue    = Math.max(0, monthEarned - monthPaid);

    return Response.json({
      success: true,
      data: {
        profile: {
          _id:          emp._id,
          empId:        emp.empId,
          name:         emp.name,
          phone:        emp.phone,
          address:      emp.address,
          joiningDate:  emp.joiningDate,
          perDaySalary: emp.perDaySalary,
          isActive:     emp.isActive,
        },
        salarySummary: {
          perDaySalary:     emp.perDaySalary,
          totalPresentDays: totalPresent,
          totalEarned,
          totalPaid,
          totalDue,
        },
        monthSummary: month ? {
          month,
          presentDays: presentDays.length,
          absentDays:  absentDays.length,
          earned:      monthEarned,
          paid:        monthPaid,
          due:         monthDue,
        } : null,
        attendance: {
          present: presentDays,
          absent:  absentDays,
        },
        payments: [...monthPayments]
          .sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1))
          .map((p) => ({ amount: p.amount, paidOn: p.paidOn, note: p.note || "" })),
        salaryHistory: [...(emp.salaryHistory || [])].reverse(),
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Employee /me error:", err);
    return Response.json(
      { success: false, error: "Kuch galat hua — dobara try karo" },
      { status: 500 }
    );
  }
});