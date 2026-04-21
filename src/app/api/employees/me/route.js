import { connectDB } from "@/lib/db";
import Employee from "@/app/api/employees/models/Employee";
import { verifyEmployee } from "@/app/api/middleware/auth";
 
export const GET = verifyEmployee(async (req) => {
  try {
    await connectDB();
 
    // ✅ FIX: Get employee from DB
    const emp = await Employee.findById(req.employee._id);
 
    // Check 1: Employee exists?
    if (!emp) {
      return Response.json(
        { success: false, error: "Employee record nahi mila" },
        { status: 404 }
      );
    }
 
    // ✅ CHECK 2: CRITICAL - Employee still active?
    if (!emp.isActive) {
      return Response.json(
        {
          success: false,
          error: "Account deactivate kar diya gaya hai admin ne",
          code: "ACCOUNT_DEACTIVATED",
        },
        { status: 403 }
      );
    }
 
    // ✅ CHECK 3: Employee not in deactivation period?
    if (emp.deactivatedOn) {
      return Response.json(
        {
          success: false,
          error: `Account deactivate ho gaya tha ${emp.deactivatedOn} ko`,
          code: "ACCOUNT_DEACTIVATED",
        },
        { status: 403 }
      );
    }
 
    // ── Attendance Map → plain object
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
 
    // ── Salary calculations
    const allValues = Object.values(attObj);
    const totalPresent = allValues.filter(
      (v) => v.status === "present" || v.status === "auto-present"
    ).length;
 
    const allPayments = emp.salaryPayments || [];
    const totalPaid = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalEarned = totalPresent * emp.perDaySalary;
    const totalDue = Math.max(0, totalEarned - totalPaid);
 
    // ✅ All checks passed - return employee data
    return Response.json({
      success: true,
      data: {
        profile: {
          _id: emp._id,
          empId: emp.empId,
          name: emp.name,
          phone: emp.phone,
          address: emp.address,
          joiningDate: emp.joiningDate,
          perDaySalary: emp.perDaySalary,
          isActive: emp.isActive,
        },
        salarySummary: {
          perDaySalary: emp.perDaySalary,
          totalPresentDays: totalPresent,
          totalEarned,
          totalPaid,
          totalDue,
        },
        attendance: {
          present: presentDays,
          absent: absentDays,
        },
        payments: [...allPayments]
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