// app/api/dashboard/profit/route.js
import { connectDB }   from "@/lib/db";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Expense         from "@/app/api/expenses/models/Expense";
import Employee        from "@/app/api/employees/models/Employee";
import Goods           from "@/app/api/goods/model";
import Repairing       from "@/app/api/repairing/models/Repairing";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─── Attendance helpers (same as salaryUtils) ─────────────────────
const calcDaySalary = (entry, perDaySalary, otRatePerHour = 0) => {
  if (!entry) return 0;
  const status = typeof entry === "string" ? entry : (entry?.status ?? "absent");
  const otHours  = Number(entry?.overtimeHours)  || 0;
  const otAmount = Number(entry?.overtimeAmount) || 0;
  switch (status) {
    case "present":
    case "auto-present": return perDaySalary;
    case "half-day":     return Math.round(perDaySalary * 0.5);
    case "overtime": {
      const otPay = otAmount > 0 ? otAmount : otHours * (otRatePerHour > 0 ? otRatePerHour : perDaySalary / 8) * 1.5;
      return Math.round(perDaySalary + otPay);
    }
    default: return 0;
  }
};

const getSalaryEarnedByDate = (emp) => {
  // Returns map of { "YYYY-MM-DD": earnedAmount }
  const history = [...(emp.salaryHistory || [])].sort((a, b) => new Date(a.from) - new Date(b.from));
  const result  = {};

  const attObj = emp.attendance instanceof Map
    ? Object.fromEntries(emp.attendance)
    : (emp.attendance || {});

  for (const [date, entry] of Object.entries(attObj)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    // salary for this date from history
    let perDay = emp.perDaySalary || 0;
    for (const h of history) {
      if (h.from <= date) perDay = h.salary;
      else break;
    }
    result[date] = calcDaySalary(entry, perDay, emp.overtimeRatePerHour || 0);
  }
  return result;
};

const toDateOnly = (d) => {
  if (!d) return "";
  const str = d instanceof Date ? d.toISOString() : String(d);
  return str.substring(0, 10);
};

const buildMonthlyBuckets = (year) => {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return Array.from({ length: 12 }, (_, m) => {
    const mm   = String(m + 1).padStart(2, "0");
    const last = new Date(year, m + 1, 0).getDate();
    return { label: MONTHS[m], start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(last).padStart(2, "0")}` };
  });
};

const buildYearlyBuckets = (n) => {
  const cur = new Date().getFullYear();
  return Array.from({ length: n }, (_, i) => {
    const y = cur - (n - 1 - i);
    return { label: String(y), start: `${y}-01-01`, end: `${y}-12-31` };
  });
};

export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "monthly";

    const yearParam  = parseInt(searchParams.get("year"));
    const yearsParam = parseInt(searchParams.get("years"));
    const year  = !isNaN(yearParam)  ? yearParam  : new Date().getFullYear();
    const years = !isNaN(yearsParam) ? yearsParam : 5;

    const buckets = view === "monthly"
      ? buildMonthlyBuckets(year)
      : buildYearlyBuckets(years);

    // ── Parallel fetch ────────────────────────────────────────────
    const [completedOrders, allExpenses, allEmployees, repairingEntries] =
      await Promise.all([
        CompletedOrder.find({}, "paymentReceive createdAt").lean(),
        Expense.find({}, "amount date").lean(),
        Employee.find({}, "isActive attendance perDaySalary salaryPayments salaryHistory overtimeRatePerHour joiningDate").lean(),
        Repairing.find({}, "amount date createdAt").lean(),
      ]);

    // ── Legacy order tracking ─────────────────────────────────────
    let legacyOrderCount = 0;

    // ── Normalize completed orders ────────────────────────────────
    const incomeItems = completedOrders.map((o) => {
      const p       = o.paymentReceive || {};
      const rawDate = p.completedDate  || o.createdAt;
      const date    = toDateOnly(rawDate);

      const receivedAmount = Number(p.finalAmount || p.receivedAmount || 0);
      const dueAmount      = Number(p.dueAmount   || 0);
      const totalAmount    = receivedAmount + dueAmount;

      const hasMaterialCost = p.totalMaterialCost !== undefined && p.totalMaterialCost !== null;
      const materialCost    = hasMaterialCost ? Number(p.totalMaterialCost) : 0;

      if (!hasMaterialCost && totalAmount > 0) legacyOrderCount++;

      return { date, totalAmount, receivedAmount, dueAmount, materialCost, isLegacy: !hasMaterialCost, source: "order" };
    });

    const repairingItems = repairingEntries.map((r) => ({
      date:           r.date || toDateOnly(r.createdAt),
      totalAmount:    Number(r.amount || 0),
      receivedAmount: Number(r.amount || 0),
      dueAmount:      0,
      materialCost:   0,
      isLegacy:       false,
      source:         "repairing",
    }));

    // Expense items
    const expenseItems = allExpenses.map((e) => ({
      date: toDateOnly(e.date) || e.date || "", amount: Number(e.amount || 0),
    }));
    const salaryEarnedMap = {};

    allEmployees.filter((e) => e.isActive).forEach((emp) => {
      const earnedByDate = getSalaryEarnedByDate(emp);
      for (const [date, earned] of Object.entries(earnedByDate)) {
        salaryEarnedMap[date] = (salaryEarnedMap[date] || 0) + earned;
      }
    });

    const salaryItems = Object.entries(salaryEarnedMap).map(([date, amount]) => ({ date, amount }));

    // ── Per-bucket aggregation ────────────────────────────────────
    const income          = [];
    const materialCost    = [];
    const expenses        = [];
    const salaries        = [];
    const totalCost       = [];
    const profit          = [];
    const received        = [];
    const due             = [];
    const repairingInc    = [];
    const orderInc        = [];
    const legacyInc       = [];

    buckets.forEach(({ start, end }) => {
      const inRange = (i) => i.date >= start && i.date <= end;

      const filteredOrders    = incomeItems.filter(inRange);
      const filteredRepairing = repairingItems.filter(inRange);
      const filteredExpenses  = expenseItems.filter(inRange);
      const filteredSalaries  = salaryItems.filter(inRange);

      const ordInc   = filteredOrders.reduce((s, i) => s + i.totalAmount, 0);
      const repInc   = filteredRepairing.reduce((s, i) => s + i.totalAmount, 0);
      const inc      = ordInc + repInc;

      const mat      = filteredOrders.reduce((s, i) => s + i.materialCost, 0);
      const exp      = filteredExpenses.reduce((s, i) => s + i.amount, 0);

      const sal      = filteredSalaries.reduce((s, i) => s + i.amount, 0);
      const cst      = mat + exp + sal;

      const rec      = filteredOrders.reduce((s, i) => s + i.receivedAmount, 0)
                     + filteredRepairing.reduce((s, i) => s + i.receivedAmount, 0);
      const due_     = filteredOrders.reduce((s, i) => s + i.dueAmount, 0);
      const legInc   = filteredOrders.filter(i => i.isLegacy).reduce((s, i) => s + i.totalAmount, 0);

      income.push(Math.round(inc));
      materialCost.push(Math.round(mat));
      expenses.push(Math.round(exp));
      salaries.push(Math.round(sal));
      totalCost.push(Math.round(cst));
      profit.push(Math.round(inc - cst));
      received.push(Math.round(rec));
      due.push(Math.round(due_));
      repairingInc.push(Math.round(repInc));
      orderInc.push(Math.round(ordInc));
      legacyInc.push(Math.round(legInc));
    });

    const sum          = (arr) => arr.reduce((a, b) => a + b, 0);
    const totalIncome  = sum(income);
    const totalMat     = sum(materialCost);
    const totalExp     = sum(expenses);
    const totalSal     = sum(salaries);
    const totalCostSum = sum(totalCost);
    const totalProfit  = totalIncome - totalCostSum;
    const totalRec     = sum(received);
    const totalDue     = sum(due);
    const totalRepInc  = sum(repairingInc);
    const totalOrdInc  = sum(orderInc);
    const totalLegInc  = sum(legacyInc);

    const profitMargin = totalIncome > 0
      ? parseFloat(((totalProfit / totalIncome) * 100).toFixed(2))
      : 0;

    const activePeriods = profit
      .map((p, i) => ({ profit: p, label: buckets[i].label, income: income[i] }))
      .filter((p) => p.income > 0 || p.profit !== 0);

    const bestPeriod  = activePeriods.length ? activePeriods.reduce((a, b) => a.profit > b.profit ? a : b) : null;
    const worstPeriod = activePeriods.length ? activePeriods.reduce((a, b) => a.profit < b.profit ? a : b) : null;

    const goodsPct    = totalCostSum > 0 ? +((totalMat / totalCostSum) * 100).toFixed(1) : 0;
    const expPct      = totalCostSum > 0 ? +((totalExp / totalCostSum) * 100).toFixed(1) : 0;
    const salPct      = totalCostSum > 0 ? +((totalSal / totalCostSum) * 100).toFixed(1) : 0;

    const allGoods = await Goods.aggregate([
      { $group: { _id: null, totalPurchased: { $sum: "$totalKg" }, totalInvested: { $sum: "$totalAmount" } } },
    ]);
    const stockInfo = allGoods[0] || { totalPurchased: 0, totalInvested: 0 };

    let prevYearProfit = null;
    let prevYearIncome = null;
    if (view === "monthly") {
      const prevBuckets = buildMonthlyBuckets(year - 1);
      const prevIncome  = [...incomeItems, ...repairingItems].filter(i => i.date >= prevBuckets[0].start && i.date <= prevBuckets[11].end).reduce((s, i) => s + i.totalAmount, 0);
      const prevSalAmt  = salaryItems.filter(i => i.date >= prevBuckets[0].start && i.date <= prevBuckets[11].end).reduce((s, i) => s + i.amount, 0);
      const prevMat     = incomeItems.filter(i => i.date >= prevBuckets[0].start && i.date <= prevBuckets[11].end).reduce((s, i) => s + i.materialCost, 0);
      const prevExp     = expenseItems.filter(i => i.date >= prevBuckets[0].start && i.date <= prevBuckets[11].end).reduce((s, i) => s + i.amount, 0);
      prevYearIncome    = Math.round(prevIncome);
      prevYearProfit    = Math.round(prevIncome - prevMat - prevExp - prevSalAmt);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        view,
        year:   view === "monthly" ? year : null,
        years:  view === "yearly"  ? years : null,
        labels: buckets.map((b) => b.label),

        // Per-period arrays
        income,
        goods:       materialCost,
        expenses,
        salaries,
        totalCost,
        profit,
        received,
        due,
        repairingIncome: repairingInc,
        orderIncome:     orderInc,

        summary: {
          totalIncome,
          totalGoods:    totalMat,
          totalExpenses: totalExp,
          totalSalaries: totalSal,
          totalCost:     totalCostSum,
          totalProfit,
          profitMargin,
          isProfit:      totalProfit >= 0,
          totalReceived: totalRec, 
          totalDue, 
          bestPeriod,
          worstPeriod,
          totalRepairingIncome: totalRepInc,
          totalOrderIncome:     totalOrdInc,
          prevYear: view === "monthly" ? {
            year:        year - 1,
            income:      prevYearIncome,
            profit:      prevYearProfit,
            incomeGrowth: prevYearIncome > 0 ? parseFloat((((totalIncome - prevYearIncome) / prevYearIncome) * 100).toFixed(1)) : null,
            profitGrowth: prevYearProfit > 0 ? parseFloat((((totalProfit - prevYearProfit) / prevYearProfit) * 100).toFixed(1)) : null,
          } : null,
        },

        costBreakdown: { goodsPct, expensesPct: expPct, salariesPct: salPct },

        stockInfo: {
          totalPurchased: stockInfo.totalPurchased,
          totalInvested:  stockInfo.totalInvested,
        },

        dataQuality: {
          legacyOrderCount,
          legacyIncome:    totalLegInc,
          hasLegacyData:   legacyOrderCount > 0,
          warning: legacyOrderCount > 0
            ? `${legacyOrderCount} purane orders mein material cost data nahi hai — profit thoda inflated ho sakta hai`
            : null,
        },
      },
    }), { status: 200 });

  } catch (err) {
    console.error("Profit API error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
});