// app/api/dashboard/profit/route.js
//
// ✅ FIX: Profit ab REAL hai:
//   profit = saleIncome - actualMaterialCost - expenses - salaries
//
// ✅ FIX: Material cost per order se aata hai (purchase rate × kg used)
//   Not from total goods purchased (jo galat tha pehle)
//
// ✅ NEW: Per-order gross profit track hota hai
// ✅ NEW: Stock investment vs actual usage cost alag dikhta hai

import { connectDB }   from "@/lib/db";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Expense         from "@/app/api/expenses/models/Expense";
import Employee        from "@/app/api/employees/models/Employee";
import Goods           from "@/app/api/goods/model";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// GET  /api/dashboard/profit
// ?view=monthly&year=2025   → 12 months
// ?view=yearly&years=5      → last N years
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

    // ── Parallel DB fetch ─────────────────────────────────────────
    const [completedOrders, allExpenses, allEmployees] = await Promise.all([
      CompletedOrder.find({}, "paymentReceive createdAt").lean(),
      Expense.find({}, "amount date").lean(),
      Employee.find({}, "salaryPayments").lean(),
    ]);

    // ─────────────────────────────────────────────────────────────
    // ✅ INCOME & MATERIAL COST — from CompletedOrders
    //
    // OLD (WRONG):
    //   income   = completed orders total sale
    //   goods    = ALL goods purchased (wrong timing!)
    //
    // NEW (CORRECT):
    //   income        = completed orders total sale
    //   materialCost  = actual material used cost per order
    //                   (purchase rate × kg used at time of completion)
    // ─────────────────────────────────────────────────────────────
    const incomeItems = completedOrders.map((o) => {
      const p       = o.paymentReceive || {};
      const rawDate = p.completedDate  || o.createdAt;
      const date    = toDateOnly(rawDate);

      const receivedAmount  = Number(p.finalAmount || p.receivedAmount || 0);
      const dueAmount       = Number(p.dueAmount   || 0);
      const totalAmount     = receivedAmount + dueAmount;
      const materialCost    = Number(p.totalMaterialCost || 0); // ✅ actual material cost

      return { date, totalAmount, receivedAmount, dueAmount, materialCost };
    });

    // Expenses (fuel, hardware, etc.) — unchanged
    const expenseItems = allExpenses.map((e) => ({
      date:   e.date   || "",
      amount: e.amount || 0,
    }));

    // Salaries — unchanged
    const salaryItems = allEmployees.flatMap((emp) =>
      (emp.salaryPayments || []).map((p) => ({
        date:   p.paidOn || "",
        amount: p.amount || 0,
      }))
    );

    // ── Per-bucket aggregation ────────────────────────────────────
    const income       = [];
    const materialCost = []; // ✅ actual material cost per period
    const expenses     = [];
    const salaries     = [];
    const totalCost    = [];
    const profit       = [];

    // receivedAmount aur dueAmount bhi track karo
    const received     = [];
    const due          = [];

    buckets.forEach(({ start, end }) => {
      const filteredIncome   = incomeItems.filter(  (i) => i.date >= start && i.date <= end);
      const filteredExpenses = expenseItems.filter( (i) => i.date >= start && i.date <= end);
      const filteredSalaries = salaryItems.filter(  (i) => i.date >= start && i.date <= end);

      const inc = filteredIncome.reduce((s, i) => s + i.totalAmount,  0);
      const mat = filteredIncome.reduce((s, i) => s + i.materialCost, 0); // ✅ actual
      const exp = filteredExpenses.reduce((s, i) => s + i.amount, 0);
      const sal = filteredSalaries.reduce((s, i) => s + i.amount, 0);
      const cst = mat + exp + sal; // ✅ REAL total cost
      const rec = filteredIncome.reduce((s, i) => s + i.receivedAmount, 0);
      const due_ = filteredIncome.reduce((s, i) => s + i.dueAmount,    0);

      income.push(Math.round(inc));
      materialCost.push(Math.round(mat));
      expenses.push(Math.round(exp));
      salaries.push(Math.round(sal));
      totalCost.push(Math.round(cst));
      profit.push(Math.round(inc - cst));
      received.push(Math.round(rec));
      due.push(Math.round(due_));
    });

    // ── Grand totals ──────────────────────────────────────────────
    const s              = (arr) => arr.reduce((a, b) => a + b, 0);
    const totalIncome    = s(income);
    const totalMaterial  = s(materialCost);
    const totalExpenses  = s(expenses);
    const totalSalaries  = s(salaries);
    const totalCostSum   = s(totalCost);
    const totalProfit    = totalIncome - totalCostSum;
    const profitMargin   = totalIncome > 0
      ? parseFloat(((totalProfit / totalIncome) * 100).toFixed(2))
      : 0;

    // Best / worst periods
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
    const goodsPct    = totalCostSum > 0 ? +((totalMaterial  / totalCostSum) * 100).toFixed(1) : 0;
    const expensesPct = totalCostSum > 0 ? +((totalExpenses  / totalCostSum) * 100).toFixed(1) : 0;
    const salariesPct = totalCostSum > 0 ? +((totalSalaries  / totalCostSum) * 100).toFixed(1) : 0;

    // ── ✅ NEW: Stock purchase info (separate from profit calc) ───
    // Ye sirf investment reference ke liye hai — profit mein count nahi
    const allGoods = await Goods.aggregate([
      {
        $group: {
          _id:         null,
          totalPurchased: { $sum: "$totalKg" },
          totalInvested:  { $sum: "$totalAmount" },
        },
      },
    ]);
    const stockInfo = allGoods[0] || { totalPurchased: 0, totalInvested: 0 };

    return new Response(JSON.stringify({
      success: true,
      data: {
        view,
        year:   view === "monthly" ? year : null,
        labels: buckets.map((b) => b.label),

        // Chart data
        income,
        goods:       materialCost, // ✅ Actual material cost used (not purchased)
        expenses,
        salaries,
        totalCost,
        profit,
        received,
        due,

        summary: {
          totalIncome,
          totalGoods:     totalMaterial,    // ✅ actual material cost used
          totalExpenses,
          totalSalaries,
          totalCost:      totalCostSum,
          totalProfit,
          profitMargin,
          isProfit:       totalProfit >= 0,
          bestPeriod,
          worstPeriod,
        },

        costBreakdown: {
          goodsPct,
          expensesPct,
          salariesPct,
        },

        // ✅ NEW: Stock investment info (reference only)
        stockInfo: {
          totalPurchased: stockInfo.totalPurchased,
          totalInvested:  stockInfo.totalInvested,
          note: "Ye total goods purchase hai — profit calculation mein actual usage cost use hoti hai",
        },
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