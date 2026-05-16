// app/api/dashboard/stats/route.js
import { connectDB }   from "@/lib/db";
import Orders          from "@/app/api/orders/models/orders";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Employee        from "@/app/api/employees/models/Employee";
import Goods           from "@/app/api/goods/model";
import Expense         from "@/app/api/expenses/models/Expense";
import Repairing       from "@/app/api/repairing/models/Repairing";
import { verifyAdmin } from "@/app/api/middleware/auth";

const getAttendanceObj = (emp) => {
  if (!emp.attendance) return {};
  if (emp.attendance instanceof Map) return Object.fromEntries(emp.attendance);
  return Object.fromEntries(
    Object.entries(emp.attendance).filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k))
  );
};
const getAttStatus = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  return v?.status || null;
};
const calcDaySalary = (entry, perDaySalary, otRatePerHour = 0) => {
  if (!entry) return 0;
  const status   = typeof entry === "string" ? entry : (entry?.status ?? "absent");
  const otHours  = Number(entry?.overtimeHours)  || 0;
  const otAmount = Number(entry?.overtimeAmount) || 0;

  switch (status) {
    case "present":
    case "auto-present": return Math.round(perDaySalary);
    case "half-day":     return Math.round(perDaySalary * 0.5);
    case "overtime": {
      const otPay = otAmount > 0
        ? otAmount
        : otHours * (otRatePerHour > 0 ? otRatePerHour : perDaySalary / 8) * 1.5;
      return Math.round(perDaySalary + otPay);
    }
    default: return 0;
  }
};

const getTotalEarned = (emp) => {
  const att = getAttendanceObj(emp);
  const history = [...(emp.salaryHistory || [])].sort(
    (a, b) => new Date(a.from) - new Date(b.from)
  );

  return Object.entries(att).reduce((sum, [date, entry]) => {
    let perDay = emp.perDaySalary || 0;
    for (const h of history) {
      if (h.from <= date) perDay = h.salary;
      else break;
    }
    return sum + calcDaySalary(entry, perDay, emp.overtimeRatePerHour || 0);
  }, 0);
};

const toDateOnly = (d) => {
  if (!d) return "";
  const str = d instanceof Date ? d.toISOString() : String(d);
  return str.substring(0, 10);
};

export const GET = verifyAdmin(async () => {
  try {
    await connectDB();

    const today     = new Date().toISOString().split("T")[0];
    const thisMonth = today.substring(0, 7);
    const thisYear  = today.substring(0, 4);

    // ── Parallel fetch ────────────────────────────────────────────
    const [
      pendingOrders,
      completedOrders,
      employees,
      goodsUsage,
      monthExpenses,
      repairingEntries,
    ] = await Promise.all([
      Orders.countDocuments({
        "orders.status": { $in: ["Pending", "Partially Completed"] },
      }),
      CompletedOrder.find(
        {},
        "paymentReceive.completedDate paymentReceive.totalAmount paymentReceive.receivedAmount paymentReceive.dueAmount paymentReceive.finalAmount"
      ).lean(),
      Employee.find({}, "isActive attendance perDaySalary salaryPayments salaryHistory overtimeRatePerHour").lean(),
      CompletedOrder.aggregate([
        {
          $unwind: {
            path: "$paymentReceive.materialUsage",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id:       "$paymentReceive.materialUsage.metalType",
            totalUsed: { $sum: "$paymentReceive.materialUsage.kgUsed" },
          },
        },
        { $match: { _id: { $ne: null } } },
      ]),

      Expense.aggregate([
        { $match: { date: { $regex: `^${thisMonth}` } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      Repairing.find({}, "amount date createdAt").lean(),
    ]);

    // ── Employee stats ────────────────────────────────────────────
    const activeEmps = employees.filter((e) => e.isActive).length;
    const totalEmps  = employees.length;

    let presentToday = 0;
    let absentToday  = 0;

    employees.filter((e) => e.isActive).forEach((emp) => {
      const att        = getAttendanceObj(emp);
      const todayEntry = att[today];
      if (!todayEntry) return;
      const s = getAttStatus(todayEntry);
      if (s === "present" || s === "auto-present") presentToday++;
      else if (s === "absent") absentToday++;
    });

    let totalSalaryDue = 0;
    employees.filter((e) => e.isActive).forEach((emp) => {
      const earned = getTotalEarned(emp);
      const paid   = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
      totalSalaryDue += Math.max(0, earned - paid);
    });

    // ── Income stats ──────────────────────────────────────────────
    let monthIncome  = 0;
    let yearIncome   = 0;
    let totalIncome  = 0;
    let totalDue     = 0;
    let todayIncome  = 0;

    completedOrders.forEach((o) => {
      const p        = o.paymentReceive || {};
      const date     = toDateOnly(p.completedDate || o.createdAt);
      const received = Number(p.finalAmount || p.receivedAmount || 0);
      const due      = Number(p.dueAmount   || 0);
      const total    = received + due;

      totalIncome += total;
      totalDue    += due;
      if (date.startsWith(thisMonth)) monthIncome += total;
      if (date.startsWith(thisYear))  yearIncome  += total;
      if (date === today)             todayIncome += total;
    });

    repairingEntries.forEach((r) => {
      const date   = r.date || toDateOnly(r.createdAt);
      const amount = Number(r.amount || 0);

      totalIncome += amount;
      if (date.startsWith(thisMonth)) monthIncome += amount;
      if (date.startsWith(thisYear))  yearIncome  += amount;
      if (date === today)             todayIncome += amount;
    });

    // ── Stock stats ───────────────────────────────────────────────
    const goodsPurchased = await Goods.aggregate([
      {
        $group: {
          _id:         "$materialType",
          totalKg:     { $sum: "$totalKg" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const stockMap = {};
    goodsPurchased.forEach((g) => { stockMap[g._id] = g.totalKg; });

    const usageMap = {};
    goodsUsage.forEach((g) => {
      if (g._id) usageMap[g._id] = g.totalUsed;
    });

    const stockRemaining = {
      MS:    Math.max(0, (stockMap["MS"]    || 0) - (usageMap["MS"]    || 0)),
      GI:    Math.max(0, (stockMap["GI"]    || 0) - (usageMap["GI"]    || 0)),
      Other: Math.max(0, (stockMap["Other"] || 0) - (usageMap["Other"] || 0)),
    };
    stockRemaining.total =
      stockRemaining.MS + stockRemaining.GI + stockRemaining.Other;

    const monthExpenseTotal = monthExpenses[0]?.total || 0;

    return new Response(JSON.stringify({
      success: true,
      data: {
        orders: {
          pending:   pendingOrders,
          completed: completedOrders.length,
        },
        employees: {
          total:          totalEmps,
          active:         activeEmps,
          inactive:       totalEmps - activeEmps,
          presentToday,
          absentToday,
          totalSalaryDue: Math.round(totalSalaryDue),
        },
        income: {
          today:     Math.round(todayIncome),
          thisMonth: Math.round(monthIncome),
          thisYear:  Math.round(yearIncome),
          total:     Math.round(totalIncome),
          totalDue:  Math.round(totalDue),
        },
        stock: {
          remaining: stockRemaining,
        },
        expenses: {
          thisMonth: Math.round(monthExpenseTotal),
        },
      },
    }), { status: 200 });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});