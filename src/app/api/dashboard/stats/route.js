// app/api/dashboard/stats/route.js
//
// ✅ FIX 1: goodsUsage $unwind crash fix
//   Pehle: $unwind: "$paymentReceive.materialUsage"
//   Bug: Agar materialUsage field missing ho (purane records) toh crash
//   Ab: preserveNullAndEmptyArrays: true — missing/empty array wale skip hote hain
//
// ✅ FIX 2: Attendance Map handling unified
//   Pehle: Map check har jagah alag alag tha — inconsistent
//   Ab: ek helper function — saaf aur reusable
//
// ✅ FIX 3: Repairing income today/month/year mein count hoti hai ab
//   Pehle: sirf CompletedOrders se income aati thi
//
// ✅ FIX 4: totalSalaryDue mein attendance value check fix
//   Pehle: v.status directly access hota tha — agar string ho toh crash
//   Ab: safe access with optional chaining

import { connectDB }   from "@/lib/db";
import Orders          from "@/app/api/orders/models/orders";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Employee        from "@/app/api/employees/models/Employee";
import Goods           from "@/app/api/goods/model";
import Expense         from "@/app/api/expenses/models/Expense";
import Repairing       from "@/app/api/repairing/models/Repairing"; // ✅ FIX 3
import { verifyAdmin } from "@/app/api/middleware/auth";

// ✅ FIX 2: Unified attendance helper
// Pehle har jagah alag alag Map check tha — ab ek function
const getAttendanceObj = (emp) => {
  if (!emp.attendance) return {};
  if (emp.attendance instanceof Map) return Object.fromEntries(emp.attendance);
  return Object.fromEntries(
    Object.entries(emp.attendance).filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k))
  );
};

// ✅ FIX 4: Safe status check
// Pehle: v.status — agar v string ho toh crash
// Ab: typeof check
const getAttStatus = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  return v?.status || null;
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
      repairingEntries, // ✅ FIX 3
    ] = await Promise.all([
      Orders.countDocuments({
        "orders.status": { $in: ["Pending", "Partially Completed"] },
      }),
      CompletedOrder.find(
        {},
        "paymentReceive.completedDate paymentReceive.totalAmount paymentReceive.receivedAmount paymentReceive.dueAmount paymentReceive.finalAmount"
      ).lean(),
      Employee.find({}, "isActive attendance perDaySalary salaryPayments").lean(),

      // ✅ FIX 1: preserveNullAndEmptyArrays — missing materialUsage wale skip honge
      // Pehle yeh crash karta tha purane records pe
      CompletedOrder.aggregate([
        {
          $unwind: {
            path: "$paymentReceive.materialUsage",
            preserveNullAndEmptyArrays: false, // ✅ missing/empty = skip
          },
        },
        {
          $group: {
            _id:       "$paymentReceive.materialUsage.metalType",
            totalUsed: { $sum: "$paymentReceive.materialUsage.kgUsed" },
          },
        },
        // ✅ FIX: null metalType wale filter karo
        { $match: { _id: { $ne: null } } },
      ]),

      Expense.aggregate([
        { $match: { date: { $regex: `^${thisMonth}` } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // ✅ FIX 3: Repairing fetch karo
      Repairing.find({}, "amount date createdAt").lean(),
    ]);

    // ── Employee stats ────────────────────────────────────────────
    const activeEmps = employees.filter((e) => e.isActive).length;
    const totalEmps  = employees.length;

    let presentToday = 0;
    let absentToday  = 0;

    employees.filter((e) => e.isActive).forEach((emp) => {
      // ✅ FIX 2: Unified helper use karo
      const att        = getAttendanceObj(emp);
      const todayEntry = att[today];
      if (!todayEntry) return;
      // ✅ FIX 4: Safe status check
      const s = getAttStatus(todayEntry);
      if (s === "present" || s === "auto-present") presentToday++;
      else if (s === "absent") absentToday++;
    });

    let totalSalaryDue = 0;
    employees.filter((e) => e.isActive).forEach((emp) => {
      // ✅ FIX 2: Unified helper
      const att = getAttendanceObj(emp);
      const presentDays = Object.values(att).filter((v) => {
        // ✅ FIX 4: Safe status check — string ya object dono handle
        const s = getAttStatus(v);
        return s === "present" || s === "auto-present";
      }).length;
      const earned = presentDays * emp.perDaySalary;
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

    // ✅ FIX 3: Repairing income bhi add karo
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
      // ✅ FIX: null/undefined metalType skip
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