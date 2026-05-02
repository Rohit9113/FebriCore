// app/api/employees/me/route.js

import { connectDB }      from "@/lib/db";
import Employee           from "@/app/api/employees/models/Employee";
import { verifyEmployee } from "@/app/api/middleware/auth";

const getSalaryForDate = (date, salaryHistory, perDaySalary) => {
  if (!salaryHistory || salaryHistory.length === 0) return perDaySalary;
  const applicable = salaryHistory
    .filter((h) => h.from <= date)
    .sort((a, b) => new Date(b.from) - new Date(a.from)); // latest first
  return applicable.length > 0 ? applicable[0].salary : perDaySalary;
};

export const GET = verifyEmployee(async (req) => {
  try {
    await connectDB();

    const emp = await Employee.findById(req.employee._id);

    if (!emp) {
      return Response.json(
        { success: false, error: "Employee record nahi mila" },
        { status: 404 }
      );
    }

    if (!emp.isActive) {
      return Response.json(
        { success: false, error: "Account deactivate kar diya gaya hai admin ne", code: "ACCOUNT_DEACTIVATED" },
        { status: 403 }
      );
    }

    if (emp.deactivatedOn) {
      return Response.json(
        { success: false, error: `Account deactivate ho gaya tha ${emp.deactivatedOn} ko`, code: "ACCOUNT_DEACTIVATED" },
        { status: 403 }
      );
    }

    const attObj = emp.attendance instanceof Map
      ? Object.fromEntries(emp.attendance)
      : Object.fromEntries(Object.entries(emp.attendance || {}));

    const allEntries = Object.entries(attObj);

    const presentDays = allEntries
      .filter(([, v]) => v.status === "present" || v.status === "auto-present")
      .map(([d]) => d)
      .sort((a, b) => (a < b ? 1 : -1));

    const absentDays = allEntries
      .filter(([, v]) => v.status === "absent")
      .map(([d]) => d)
      .sort((a, b) => (a < b ? 1 : -1));

    const salaryHistory = emp.salaryHistory || [];
    const totalEarned = presentDays.reduce(
      (sum, date) => sum + getSalaryForDate(date, salaryHistory, emp.perDaySalary),
      0
    );

    const allPayments = emp.salaryPayments || [];
    const totalPaid   = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalDue    = Math.max(0, totalEarned - totalPaid);
    const url         = new URL(req.url);
    const monthParam  = url.searchParams.get("month");

    let monthSummary = null;
    if (monthParam) {
      const monthPresent = presentDays.filter((d) => d.startsWith(monthParam));
      const monthAbsent  = absentDays.filter((d)  => d.startsWith(monthParam));

      const monthEarned = monthPresent.reduce(
        (sum, date) => sum + getSalaryForDate(date, salaryHistory, emp.perDaySalary),
        0
      );

      const monthPaid = allPayments
        .filter((p) => p.paidOn?.startsWith(monthParam))
        .reduce((s, p) => s + (p.amount || 0), 0);

      monthSummary = {
        month:       monthParam,
        presentDays: monthPresent.length,
        absentDays:  monthAbsent.length,
        earned:      monthEarned,
        paid:        monthPaid,
        due:         totalDue,
      };
    }

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
          totalPresentDays: presentDays.length,
          totalAbsentDays:  absentDays.length,
          totalEarned,       // ← ab sahi hai
          totalPaid,
          totalDue,
          paymentCount:     allPayments.length,
        },
        monthSummary,

        attendance: {
          present: presentDays,
          absent:  absentDays,
        },

        payments: [...allPayments]
          .sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1))
          .map((p) => ({ amount: p.amount, paidOn: p.paidOn, note: p.note || "" })),

        salaryHistory: [...salaryHistory].reverse(),
      },
    }, { status: 200 });

  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Employee /me error:", err);
    }
    return Response.json(
      { success: false, error: "Kuch galat hua — dobara try karo" },
      { status: 500 }
    );
  }
});