// app/api/employees/salaryUtils.js
export const calcDaySalary = (attendanceEntry, perDaySalary, overtimeRatePerHour = 0) => {
  if (!attendanceEntry) return 0;

  const status = typeof attendanceEntry === "string"
    ? attendanceEntry
    : (attendanceEntry?.status ?? "absent");

  const overtimeHours  = Number(attendanceEntry?.overtimeHours)  || 0;
  const overtimeAmount = Number(attendanceEntry?.overtimeAmount) || 0;

  switch (status) {
    case "present":
    case "auto-present":
      return Math.round(perDaySalary);

    case "half-day":
      return Math.round(perDaySalary * 0.5);

    case "overtime": {
      let otPay = 0;
      if (overtimeAmount > 0) {
        // ✅ Custom amount — seedha use karo, hours ignore
        otPay = overtimeAmount;
      } else if (overtimeHours > 0) {
        const hourlyRate = overtimeRatePerHour > 0
          ? overtimeRatePerHour
          : perDaySalary / 8;
        otPay = overtimeHours * hourlyRate * 1.5;
      }
      return Math.round(perDaySalary + otPay);
    }

    case "absent":
    default:
      return 0;
  }
};

// ─── Salary with history lookup ───────────────────────────────────
export const getSalaryForDate = (date, emp) => {
  const history = [...(emp.salaryHistory || [])].sort(
    (a, b) => new Date(a.from) - new Date(b.from)
  );

  let perDaySalary = emp.perDaySalary || 0;

  if (history.length > 0) {
    let applicable = null;
    for (const entry of history) {
      if (entry.from <= date) applicable = entry.salary;
      else break;
    }
    if (applicable !== null) perDaySalary = applicable;
  }

  // ✅ Map aur plain object dono handle karo
  const attendanceEntry = emp.attendance instanceof Map
    ? emp.attendance.get(date)
    : emp.attendance?.[date];

  return calcDaySalary(attendanceEntry, perDaySalary, emp.overtimeRatePerHour || 0);
};

// ─── Employee stats ───────────────────────────────────────────────
export const getEmpStats = (emp) => {
  // ✅ BUG FIX: Mongoose Map → plain object convert karo
  //
  // Pehle: Object.entries(emp.attendance || {})
  //   → Mongoose Map pe Object.entries() = [] (hamesha empty)
  //   → entries loop nahi chalta → totalEarned = 0
  //
  // Ab: instanceof Map check → Object.fromEntries() se convert
  //   → sab entries correctly milti hain
  //   → overtime, half-day, present sab sahi calculate hota hai
  const attObj = emp.attendance instanceof Map
    ? Object.fromEntries(emp.attendance)      // ✅ Map → plain object
    : (emp.attendance || {});                 // already plain object

  const entries = Object.entries(attObj);

  let present = 0, halfDay = 0, overtime = 0, absent = 0, totalEarned = 0;

  entries.forEach(([date, v]) => {
    const status = typeof v === "string" ? v : (v?.status ?? "absent");
    totalEarned += getSalaryForDate(date, emp);

    if      (status === "present" || status === "auto-present") present++;
    else if (status === "half-day")  halfDay++;
    else if (status === "overtime")  overtime++;
    else if (status === "absent")    absent++;
  });

  const paidAmount = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);

  return {
    present,
    halfDay,
    overtime,
    absent,
    totalEarned: Math.round(totalEarned),
    paidAmount:  Math.round(paidAmount),
    dueAmount:   Math.max(0, Math.round(totalEarned - paidAmount)),
    total:       entries.length,
  };
};