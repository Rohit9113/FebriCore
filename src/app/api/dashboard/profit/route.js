// app/api/dashboard/profit/route.js
//
// ✅ FIX: Purane CompletedOrders mein totalMaterialCost missing hota tha
//   Woh orders profit mein zero cost assume karte the — profit inflated dikhta tha
//   Ab unhe clearly "legacy" mark kiya hai aur frontend ko warn karo
//
// ✅ FIX: parseInt NaN validation
// ✅ FIX: Repairing income included (Step 1 se)

import { connectDB }   from "@/lib/db";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Expense         from "@/app/api/expenses/models/Expense";
import Employee        from "@/app/api/employees/models/Employee";
import Goods           from "@/app/api/goods/model";
import Repairing       from "@/app/api/repairing/models/Repairing";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "monthly";

    // ✅ FIX: parseInt with NaN check
    const yearParam  = parseInt(searchParams.get("year"));
    const yearsParam = parseInt(searchParams.get("years"));
    const year  = !isNaN(yearParam)  ? yearParam  : new Date().getFullYear();
    const years = !isNaN(yearsParam) ? yearsParam : 5;

    const buckets = view === "monthly"
      ? buildMonthlyBuckets(year)
      : buildYearlyBuckets(years);

    const [completedOrders, allExpenses, allEmployees, repairingEntries] =
      await Promise.all([
        CompletedOrder.find({}, "paymentReceive createdAt").lean(),
        Expense.find({}, "amount date").lean(),
        Employee.find({}, "salaryPayments").lean(),
        Repairing.find({}, "amount date createdAt").lean(),
      ]);

    // ── ✅ FIX: Legacy orders track karo ─────────────────────────
    // Purane orders jinmein totalMaterialCost field nahi thi
    // Unhe count karo taaki frontend warn kar sake
    let legacyOrderCount = 0;

    const incomeItems = completedOrders.map((o) => {
      const p       = o.paymentReceive || {};
      const rawDate = p.completedDate  || o.createdAt;
      const date    = toDateOnly(rawDate);

      const receivedAmount = Number(p.finalAmount || p.receivedAmount || 0);
      const dueAmount      = Number(p.dueAmount   || 0);
      const totalAmount    = receivedAmount + dueAmount;

      // ✅ FIX: totalMaterialCost check
      // Purane orders mein yeh field nahi thi — 0 assume karna GALAT hai
      // Isliye legacy flag lagao
      const hasMaterialCost = p.totalMaterialCost !== undefined &&
                              p.totalMaterialCost !== null;
      const materialCost    = hasMaterialCost ? Number(p.totalMaterialCost) : 0;

      if (!hasMaterialCost && totalAmount > 0) {
        legacyOrderCount++; // ✅ Track legacy orders
      }

      return { date, totalAmount, receivedAmount, dueAmount, materialCost, isLegacy: !hasMaterialCost };
    });

    // Repairing items
    const repairingItems = repairingEntries.map((r) => ({
      date:          r.date || toDateOnly(r.createdAt),
      totalAmount:   Number(r.amount || 0),
      receivedAmount:Number(r.amount || 0),
      dueAmount:     0,
      materialCost:  0,
      isLegacy:      false,
    }));

    const expenseItems = allExpenses.map((e) => ({
      date: e.date || "", amount: e.amount || 0,
    }));

    const salaryItems = allEmployees.flatMap((emp) =>
      (emp.salaryPayments || []).map((p) => ({
        date: p.paidOn || "", amount: p.amount || 0,
      }))
    );

    // ── Per-bucket aggregation ────────────────────────────────────
    const income       = [];
    const materialCost = [];
    const expenses     = [];
    const salaries     = [];
    const totalCost    = [];
    const profit       = [];
    const received     = [];
    const due          = [];
    const repairingInc = [];
    const legacyIncome = []; // ✅ FIX: Legacy orders ka income alag track karo

    buckets.forEach(({ start, end }) => {
      const inRange = (i) => i.date >= start && i.date <= end;

      const filteredOrders    = incomeItems.filter(inRange);
      const filteredRepairing = repairingItems.filter(inRange);
      const filteredExpenses  = expenseItems.filter(inRange);
      const filteredSalaries  = salaryItems.filter(inRange);

      const orderInc  = filteredOrders.reduce((s, i) => s + i.totalAmount, 0);
      const repairInc = filteredRepairing.reduce((s, i) => s + i.totalAmount, 0);
      const inc       = orderInc + repairInc;

      const mat = filteredOrders.reduce((s, i) => s + i.materialCost, 0);
      const exp = filteredExpenses.reduce((s, i) => s + i.amount, 0);
      const sal = filteredSalaries.reduce((s, i) => s + i.amount, 0);
      const cst = mat + exp + sal;

      const rec  = filteredOrders.reduce((s, i) => s + i.receivedAmount, 0)
                 + filteredRepairing.reduce((s, i) => s + i.receivedAmount, 0);
      const due_ = filteredOrders.reduce((s, i) => s + i.dueAmount, 0);

      // ✅ FIX: Legacy income track karo — jinmein material cost nahi thi
      const legInc = filteredOrders
        .filter(i => i.isLegacy)
        .reduce((s, i) => s + i.totalAmount, 0);

      income.push(Math.round(inc));
      materialCost.push(Math.round(mat));
      expenses.push(Math.round(exp));
      salaries.push(Math.round(sal));
      totalCost.push(Math.round(cst));
      profit.push(Math.round(inc - cst));
      received.push(Math.round(rec));
      due.push(Math.round(due_));
      repairingInc.push(Math.round(repairInc));
      legacyIncome.push(Math.round(legInc));
    });

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
    const totalRepairingIncome = s(repairingInc);
    const totalLegacyIncome    = s(legacyIncome); // ✅

    const activePeriods = profit
      .map((p, i) => ({ profit: p, label: buckets[i].label, income: income[i] }))
      .filter((p) => p.income > 0 || p.profit !== 0);

    const bestPeriod  = activePeriods.length
      ? activePeriods.reduce((a, b) => (a.profit > b.profit ? a : b))
      : null;
    const worstPeriod = activePeriods.length
      ? activePeriods.reduce((a, b) => (a.profit < b.profit ? a : b))
      : null;

    const goodsPct    = totalCostSum > 0 ? +((totalMaterial / totalCostSum) * 100).toFixed(1) : 0;
    const expensesPct = totalCostSum > 0 ? +((totalExpenses / totalCostSum) * 100).toFixed(1) : 0;
    const salariesPct = totalCostSum > 0 ? +((totalSalaries / totalCostSum) * 100).toFixed(1) : 0;

    const allGoods = await Goods.aggregate([
      { $group: { _id: null, totalPurchased: { $sum: "$totalKg" }, totalInvested: { $sum: "$totalAmount" } } },
    ]);
    const stockInfo = allGoods[0] || { totalPurchased: 0, totalInvested: 0 };

    return new Response(JSON.stringify({
      success: true,
      data: {
        view,
        year:   view === "monthly" ? year : null,
        labels: buckets.map((b) => b.label),
        income,
        goods:       materialCost,
        expenses,
        salaries,
        totalCost,
        profit,
        received,
        due,
        repairingIncome: repairingInc,

        summary: {
          totalIncome,
          totalGoods:          totalMaterial,
          totalExpenses,
          totalSalaries,
          totalCost:           totalCostSum,
          totalProfit,
          profitMargin,
          isProfit:            totalProfit >= 0,
          bestPeriod,
          worstPeriod,
          totalRepairingIncome,
          orderIncome:         totalIncome - totalRepairingIncome,
        },

        costBreakdown: { goodsPct, expensesPct, salariesPct },

        stockInfo: {
          totalPurchased: stockInfo.totalPurchased,
          totalInvested:  stockInfo.totalInvested,
        },

        // ✅ FIX: Legacy order warning — frontend ko batao
        // Purane orders jinmein material cost track nahi tha
        // Unka profit calculation accurate nahi hai
        dataQuality: {
          legacyOrderCount,
          legacyIncome: totalLegacyIncome,
          // ✅ Agar legacy orders hain toh frontend warning dikha sakta hai
          hasLegacyData: legacyOrderCount > 0,
          warning: legacyOrderCount > 0
            ? `${legacyOrderCount} purane orders mein material cost data nahi hai — profit underestimated ho sakta hai`
            : null,
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

// ─── Helpers ─────────────────────────────────────────────────────
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