// app/api/employees/me/route.js
import { connectDB }        from "@/lib/db";
import Employee             from "@/app/api/employees/models/Employee";
import { verifyEmployee }   from "@/app/api/middleware/auth";
import { getSalaryForDate } from "@/app/api/employees/salaryUtils";

// ─── BUG FIX: Admin ke /salary/pay GET se match kiya ─────────────
//
// Admin /api/employees/[id]/salary/pay:
//   - getSalaryForDate(date, employee) → calcDaySalary internally call hoti hai
//   - allEntries pe loop → present + half-day + overtime + absent sab sahi
//
// Employee /me (pehle):
//   - sirf presentDays pe loop → half-day + overtime miss
//   - local getSalaryForDate sirf rate return karta tha, calculated amount nahi
//   - monthSummary.due mein global totalDue aa raha tha
//   - attendance response mein half-day + overtime nahi tha
//
// Ab: admin ke salary/pay GET jaisa hi logic apply kiya hai
// ─────────────────────────────────────────────────────────────────

const getAttObj = (emp) =>
  emp.attendance instanceof Map
    ? Object.fromEntries(emp.attendance)
    : (emp.attendance || {});

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

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM" optional

    const attObj  = getAttObj(emp);
    const allEntries = Object.entries(attObj);

    // ── Filter by month if provided ───────────────────────────────
    const filteredEntries = month
      ? allEntries.filter(([date]) => date.startsWith(month))
      : allEntries;

    // ── Attendance buckets ────────────────────────────────────────
    const presentDates = [];
    const halfDayDates = [];
    const overtimeDates = [];
    const absentDates  = [];

    filteredEntries.forEach(([date, v]) => {
      const s = typeof v === "string" ? v : (v?.status ?? "absent");
      if      (s === "present" || s === "auto-present") presentDates.push(date);
      else if (s === "half-day")  halfDayDates.push(date);
      else if (s === "overtime")  overtimeDates.push(date);
      else if (s === "absent")    absentDates.push(date);
    });

    // Sort latest first
    const sortDesc = (a, b) => (a < b ? 1 : -1);
    presentDates.sort(sortDesc);
    halfDayDates.sort(sortDesc);
    overtimeDates.sort(sortDesc);
    absentDates.sort(sortDesc);

    // ── Salary earned (admin ke salary/pay GET jaisa) ─────────────
    // getSalaryForDate(date, emp) → calcDaySalary internally
    // absent=0, half-day=0.5x, present=1x, overtime=1x+otPay
    const filteredNonAbsent = filteredEntries
      .filter(([, v]) => {
        const s = typeof v === "string" ? v : (v?.status ?? "absent");
        return s !== "absent";
      })
      .map(([date]) => date);

    const totalEarned = filteredNonAbsent.reduce(
      (sum, date) => sum + getSalaryForDate(date, emp),
      0
    );

    // ── Payments ──────────────────────────────────────────────────
    const allPayments  = emp.salaryPayments || [];
    const totalPaid    = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalDue     = Math.max(0, Math.round(totalEarned) - Math.round(totalPaid));

    // ── Overtime detail (for display) ────────────────────────────
    const overtimeDetail = overtimeDates.map((date) => {
      const v = attObj[date];
      return {
        date,
        overtimeHours:  typeof v === "object" ? (v?.overtimeHours  || 0) : 0,
        overtimeAmount: typeof v === "object" ? (v?.overtimeAmount || 0) : 0,
        earned:         getSalaryForDate(date, emp),
      };
    });

    // ── Month summary ─────────────────────────────────────────────
    let monthSummary = null;
    if (month) {
      const monthPaid = allPayments
        .filter((p) => p.paidOn?.startsWith(month))
        .reduce((s, p) => s + (p.amount || 0), 0);

      monthSummary = {
        month,
        presentDays:  presentDates.length,
        halfDayDays:  halfDayDates.length,
        overtimeDays: overtimeDates.length,
        absentDays:   absentDates.length,
        totalEarned:  Math.round(totalEarned),
        totalPaid:    Math.round(monthPaid),
        totalDue:     Math.max(0, Math.round(totalEarned - monthPaid)),
      };
    }

    // ── Overall stats (always full, not filtered) ─────────────────
    // Month filter applied above — ab overall bhi chahiye frontend ke liye
    const allNonAbsent = allEntries
      .filter(([, v]) => {
        const s = typeof v === "string" ? v : (v?.status ?? "absent");
        return s !== "absent";
      })
      .map(([date]) => date);

    const overallEarned = allNonAbsent.reduce(
      (sum, date) => sum + getSalaryForDate(date, emp),
      0
    );

    let overallPresent = 0, overallHalf = 0, overallOT = 0, overallAbsent = 0;
    allEntries.forEach(([, v]) => {
      const s = typeof v === "string" ? v : (v?.status ?? "absent");
      if      (s === "present" || s === "auto-present") overallPresent++;
      else if (s === "half-day")  overallHalf++;
      else if (s === "overtime")  overallOT++;
      else if (s === "absent")    overallAbsent++;
    });

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

        // Overall salary (full history, not month-filtered)
        salarySummary: {
          perDaySalary:      emp.perDaySalary,
          totalPresentDays:  overallPresent,
          totalHalfDays:     overallHalf,
          totalOvertimeDays: overallOT,
          totalAbsentDays:   overallAbsent,
          totalEarned:       Math.round(overallEarned),
          totalPaid:         Math.round(totalPaid),
          totalDue:          Math.max(0, Math.round(overallEarned - totalPaid)),
          paymentCount:      allPayments.length,
        },

        // Month-filtered summary (if ?month=YYYY-MM passed)
        monthSummary,

        // Attendance lists (month-filtered if ?month passed, else all)
        summary: {
          presentDays:   presentDates.length,
          halfDayDays:   halfDayDates.length,
          overtimeDays:  overtimeDates.length,
          absentDays:    absentDates.length,
          totalEarned:   Math.round(totalEarned),
          totalPaid:     Math.round(totalPaid),
          totalDue,
        },

        presentDatesList:  presentDates,
        halfDayDatesList:  halfDayDates,
        overtimeDatesList: overtimeDates,
        absentDatesList:   absentDates,
        overtimeDetail,

        payments: [...allPayments]
          .sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1))
          .map((p) => ({ amount: p.amount, paidOn: p.paidOn, note: p.note || "" })),

        salaryHistory: [...(emp.salaryHistory || [])].reverse(),
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