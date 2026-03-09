import { connectDB }   from "@/lib/db";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Goods           from "@/app/api/goods/model";
import Expense         from "@/app/api/expenses/models/Expense";
import Employee        from "@/app/api/employees/models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// GET  /api/dashboard/profit
//
// Profit = Income − (Goods + Expenses + Salaries)
//
// Query params:
//   ?view=monthly&year=2025   → 12 months
//   ?view=yearly&years=5      → last N years (default 5)
//
// Response:
// {
//   success: true,
//   data: {
//     view, year, labels[],
//     income[],    ← completed orders totalAmount
//     goods[],     ← raw material cost
//     expenses[],  ← fuel, hardware, other
//     salaries[],  ← salary payments made
//     totalCost[], ← goods + expenses + salaries
//     profit[],    ← income - totalCost (negative = loss)
//     summary: {
//       totalIncome, totalGoods, totalExpenses, totalSalaries,
//       totalCost, totalProfit, profitMargin,
//       isProfit, bestPeriod, worstPeriod
//     },
//     costBreakdown: { goodsPct, expensesPct, salariesPct }
//   }
// }
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const view  = searchParams.get("view")  || "monthly";
    const year  = parseInt(searchParams.get("year")  || new Date().getFullYear());
    const years = parseInt(searchParams.get("years") || 5);

    const buckets = view === "monthly"
      ? buildMonthlyBuckets(year)
      : buildYearlyBuckets(years);

    // ── Parallel DB fetch ────────────────────────────────────────
    const [completedOrders, allGoods, allExpenses, allEmployees] =
      await Promise.all([
        CompletedOrder.find({}, "paymentReceive createdAt").lean(),
        Goods.find({},         "totalAmount date").lean(),
        Expense.find({},       "amount date").lean(),
        Employee.find({},      "salaryPayments").lean(),
      ]);

    // ── Normalize each source into { date, amount } arrays ───────

    // Income — finalAmount = received, total = finalAmount + dueAmount
    const incomeItems = completedOrders.map((o) => ({
      date:   toDateOnly(o.paymentReceive?.completedDate || o.createdAt),
      amount: Number(o.paymentReceive?.finalAmount || 0) + Number(o.paymentReceive?.dueAmount || 0),
    }));

    // Goods
    const goodsItems = allGoods.map((g) => ({
      date:   g.date        || "",
      amount: g.totalAmount || 0,
    }));

    // Expenses
    const expenseItems = allExpenses.map((e) => ({
      date:   e.date   || "",
      amount: e.amount || 0,
    }));

    // Salaries — flatten all employees' payment logs
    const salaryItems = allEmployees.flatMap((emp) =>
      (emp.salaryPayments || []).map((p) => ({
        date:   p.paidOn || "",
        amount: p.amount || 0,
      }))
    );

    // ── Per-bucket aggregation ───────────────────────────────────
    const income   = [];
    const goods    = [];
    const expenses = [];
    const salaries = [];
    const totalCost = [];
    const profit    = [];

    buckets.forEach(({ start, end }) => {
      const inc = sumRange(incomeItems,   start, end);
      const goo = sumRange(goodsItems,    start, end);
      const exp = sumRange(expenseItems,  start, end);
      const sal = sumRange(salaryItems,   start, end);
      const cst = goo + exp + sal;

      income.push(inc);
      goods.push(goo);
      expenses.push(exp);
      salaries.push(sal);
      totalCost.push(cst);
      profit.push(inc - cst);
    });

    // ── Grand totals ─────────────────────────────────────────────
    const s              = (arr) => arr.reduce((a, b) => a + b, 0);
    const totalIncome    = s(income);
    const totalGoods     = s(goods);
    const totalExpenses  = s(expenses);
    const totalSalaries  = s(salaries);
    const totalCostSum   = s(totalCost);
    const totalProfit    = totalIncome - totalCostSum;
    const profitMargin   = totalIncome > 0
      ? parseFloat(((totalProfit / totalIncome) * 100).toFixed(2))
      : 0;

    // Best and worst periods (only periods with activity)
    const activePeriods = profit
      .map((p, i) => ({ profit: p, label: buckets[i].label, income: income[i] }))
      .filter((p) => p.income > 0 || p.profit !== 0);

    const bestPeriod  = activePeriods.length
      ? activePeriods.reduce((a, b) => (a.profit > b.profit ? a : b))
      : null;
    const worstPeriod = activePeriods.length
      ? activePeriods.reduce((a, b) => (a.profit < b.profit ? a : b))
      : null;

    // Cost breakdown %
    const goodsPct    = totalCostSum > 0 ? +((totalGoods    / totalCostSum) * 100).toFixed(1) : 0;
    const expensesPct = totalCostSum > 0 ? +((totalExpenses / totalCostSum) * 100).toFixed(1) : 0;
    const salariesPct = totalCostSum > 0 ? +((totalSalaries / totalCostSum) * 100).toFixed(1) : 0;

    return new Response(JSON.stringify({
      success: true,
      data: {
        view,
        year:   view === "monthly" ? year : null,
        labels: buckets.map((b) => b.label),
        income,
        goods,
        expenses,
        salaries,
        totalCost,
        profit,
        summary: {
          totalIncome,
          totalGoods,
          totalExpenses,
          totalSalaries,
          totalCost:   totalCostSum,
          totalProfit,
          profitMargin,
          isProfit:    totalProfit >= 0,
          bestPeriod,
          worstPeriod,
        },
        costBreakdown: { goodsPct, expensesPct, salariesPct },
      },
    }), { status: 200 });

  } catch (err) {
    console.error("Profit API error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const toDateOnly = (d) => {
  if (!d) return "";
  const str = d instanceof Date ? d.toISOString() : String(d);
  return str.substring(0, 10);
};
const dateStr  = (d) => toDateOnly(d);
const sumRange = (items, start, end) =>
  items
    .filter((i) => i.date >= start && i.date <= end)
    .reduce((s, i) => s + (i.amount || 0), 0);

const buildMonthlyBuckets = (year) => {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  return Array.from({ length: 12 }, (_, m) => {
    const mm   = String(m + 1).padStart(2, "0");
    const last = new Date(year, m + 1, 0).getDate();
    return {
      label: MONTHS[m],
      start: `${year}-${mm}-01`,
      end:   `${year}-${mm}-${String(last).padStart(2, "0")}`,
    };
  });
};

const buildYearlyBuckets = (n) => {
  const cur = new Date().getFullYear();
  return Array.from({ length: n }, (_, i) => {
    const y = cur - (n - 1 - i);
    return { label: String(y), start: `${y}-01-01`, end: `${y}-12-31` };
  });
};