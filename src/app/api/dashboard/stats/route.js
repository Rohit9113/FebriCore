// app/api/dashboard/stats/route.js
// ✅ NEW: Single endpoint — saari summary ek call mein
// WelcomeBanner aur dashboard ke liye useful

import { connectDB }   from "@/lib/db";
import Orders          from "@/app/api/orders/models/orders";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Employee        from "@/app/api/employees/models/Employee";
import Goods           from "@/app/api/goods/model";
import Expense         from "@/app/api/expenses/models/Expense";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const GET = verifyAdmin(async () => {
  try {
    await connectDB();

    const today     = new Date().toISOString().split("T")[0];
    const thisMonth = today.substring(0, 7); // "YYYY-MM"
    const thisYear  = today.substring(0, 4); // "YYYY"

    // ── Parallel fetch ────────────────────────────────────────────
    const [
      pendingOrders,
      completedOrders,
      employees,
      goodsUsage,
      monthExpenses,
    ] = await Promise.all([
      Orders.countDocuments({
        "orders.status": { $in: ["Pending", "Partially Completed"] },
      }),
      CompletedOrder.find(
        {},
        "paymentReceive.completedDate paymentReceive.totalAmount paymentReceive.receivedAmount paymentReceive.dueAmount paymentReceive.finalAmount"
      ).lean(),
      Employee.find({}, "isActive attendance perDaySalary salaryPayments").lean(),
      // Stock usage from completed orders (current month)
      CompletedOrder.aggregate([
        { $unwind: "$paymentReceive.materialUsage" },
        {
          $group: {
            _id:       "$paymentReceive.materialUsage.metalType",
            totalUsed: { $sum: "$paymentReceive.materialUsage.kgUsed" },
          },
        },
      ]),
      Expense.aggregate([
        { $match: { date: { $regex: `^${thisMonth}` } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    // ── Employee stats ────────────────────────────────────────────
    const activeEmps   = employees.filter((e) => e.isActive).length;
    const totalEmps    = employees.length;

    // Today attendance
    let presentToday = 0;
    let absentToday  = 0;
    employees.filter((e) => e.isActive).forEach((emp) => {
      const att = emp.attendance instanceof Map
        ? Object.fromEntries(emp.attendance)
        : (emp.attendance || {});
      const todayEntry = att[today];
      if (!todayEntry)  return;
      const s = todayEntry.status;
      if (s === "present" || s === "auto-present") presentToday++;
      else if (s === "absent") absentToday++;
    });

    // Total salary due
    let totalSalaryDue = 0;
    employees.filter((e) => e.isActive).forEach((emp) => {
      const att = emp.attendance instanceof Map
        ? Object.fromEntries(emp.attendance)
        : (emp.attendance || {});
      const presentDays = Object.values(att).filter(
        (v) => v.status === "present" || v.status === "auto-present"
      ).length;
      const earned = presentDays * emp.perDaySalary;
      const paid   = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
      totalSalaryDue += Math.max(0, earned - paid);
    });

    // ── Income stats ──────────────────────────────────────────────
    const toDateOnly = (d) => {
      if (!d) return "";
      const str = d instanceof Date ? d.toISOString() : String(d);
      return str.substring(0, 10);
    };

    let monthIncome    = 0;
    let yearIncome     = 0;
    let totalIncome    = 0;
    let totalDue       = 0;
    let todayIncome    = 0;

    completedOrders.forEach((o) => {
      const p           = o.paymentReceive || {};
      const date        = toDateOnly(p.completedDate || o.createdAt);
      const received    = Number(p.finalAmount || p.receivedAmount || 0);
      const due         = Number(p.dueAmount   || 0);
      const total       = received + due;

      totalIncome    += total;
      totalDue       += due;
      if (date.startsWith(thisMonth)) monthIncome  += total;
      if (date.startsWith(thisYear))  yearIncome   += total;
      if (date === today)             todayIncome  += total;
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

    const stockMap   = {};
    goodsPurchased.forEach((g) => { stockMap[g._id] = g.totalKg; });

    const usageMap   = {};
    goodsUsage.forEach((g) => { usageMap[g._id] = g.totalUsed; });

    const stockRemaining = {
      MS:    Math.max(0, (stockMap["MS"]    || 0) - (usageMap["MS"]    || 0)),
      GI:    Math.max(0, (stockMap["GI"]    || 0) - (usageMap["GI"]    || 0)),
      Other: Math.max(0, (stockMap["Other"] || 0) - (usageMap["Other"] || 0)),
    };
    stockRemaining.total =
      stockRemaining.MS + stockRemaining.GI + stockRemaining.Other;

    const monthExpenseTotal = monthExpenses[0]?.total || 0;

    // ── Response ──────────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      data: {
        orders: {
          pending:   pendingOrders,
          completed: completedOrders.length,
        },
        employees: {
          total:         totalEmps,
          active:        activeEmps,
          inactive:      totalEmps - activeEmps,
          presentToday,
          absentToday,
          totalSalaryDue: Math.round(totalSalaryDue),
        },
        income: {
          today:       Math.round(todayIncome),
          thisMonth:   Math.round(monthIncome),
          thisYear:    Math.round(yearIncome),
          total:       Math.round(totalIncome),
          totalDue:    Math.round(totalDue),
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