// app/api/dashboard/income/route.js
//
// ✅ FIX: Repairing income ab include hoti hai
// Pehle sirf CompletedOrders se income aati thi
// Ab Repairing entries bhi income mein count hoti hain

import { connectDB }   from "@/lib/db";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import Repairing       from "@/app/api/repairing/models/Repairing"; // ✅ NEW
import { verifyAdmin } from "@/app/api/middleware/auth";

export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const view  = searchParams.get("view")  || "monthly";

    // ✅ FIX: parseInt with validation — NaN se bachao
    const yearParam  = parseInt(searchParams.get("year"));
    const yearsParam = parseInt(searchParams.get("years"));
    const year  = !isNaN(yearParam)  ? yearParam  : new Date().getFullYear();
    const years = !isNaN(yearsParam) ? yearsParam : 5;

    const buckets = view === "monthly"
      ? buildMonthlyBuckets(year)
      : buildYearlyBuckets(years);

    // ✅ FIX: Dono sources fetch karo parallel mein
    const [orders, repairingEntries] = await Promise.all([
      CompletedOrder.find({}).lean(),
      Repairing.find({}).lean(),       // ✅ NEW
    ]);

    // ── Orders normalize karo ─────────────────────────────────────
    const orderItems = orders.map((o) => {
      const p = o.paymentReceive || {};
      const rawDate = p.completedDate || o.createdAt;
      const date = toDateOnly(rawDate);

      const receivedAmount = Number(p.finalAmount || p.receivedAmount || 0);
      const dueAmount      = Number(p.dueAmount   || 0);
      const totalAmount    = receivedAmount + dueAmount;

      return { date, totalAmount, receivedAmount, dueAmount, source: "order" };
    });

    // ✅ NEW: Repairing entries normalize karo
    // Repairing income = received amount (koi due nahi hota)
    const repairingItems = repairingEntries.map((r) => ({
      date:            r.date || toDateOnly(r.createdAt),
      totalAmount:     Number(r.amount || 0),
      receivedAmount:  Number(r.amount || 0), // repairing mein full payment hoti hai
      dueAmount:       0,
      source:          "repairing", // ✅ source track karo
    }));

    // ── Dono sources combine karo ─────────────────────────────────
    const allItems = [...orderItems, ...repairingItems];

    // ── Per-bucket aggregation ────────────────────────────────────
    const income          = [];
    const receivedAmount  = [];
    const dueAmount       = [];
    const orderCount      = [];
    const repairingIncome = []; // ✅ NEW: alag bhi track karo

    buckets.forEach(({ start, end }) => {
      const filtered          = allItems.filter((i) => i.date >= start && i.date <= end);
      const filteredRepairing = repairingItems.filter((i) => i.date >= start && i.date <= end);

      income.push(        filtered.reduce((s, i) => s + i.totalAmount,    0));
      receivedAmount.push(filtered.reduce((s, i) => s + i.receivedAmount, 0));
      dueAmount.push(     filtered.reduce((s, i) => s + i.dueAmount,      0));
      orderCount.push(    filtered.length);
      repairingIncome.push(filteredRepairing.reduce((s, i) => s + i.totalAmount, 0)); // ✅
    });

    // ── Summary ───────────────────────────────────────────────────
    const totalIncome         = income.reduce((a, b) => a + b, 0);
    const totalReceived       = receivedAmount.reduce((a, b) => a + b, 0);
    const totalDue            = dueAmount.reduce((a, b) => a + b, 0);
    const totalOrders         = orderCount.reduce((a, b) => a + b, 0);
    const totalRepairingIncome= repairingIncome.reduce((a, b) => a + b, 0); // ✅
    const avgOrderValue       = totalOrders > 0 ? Math.round(totalIncome / totalOrders) : 0;

    const maxVal     = Math.max(...income);
    const bestIdx    = income.indexOf(maxVal);
    const bestPeriod = maxVal > 0
      ? { label: buckets[bestIdx].label, amount: maxVal }
      : null;

    return new Response(JSON.stringify({
      success: true,
      data: {
        view,
        year:   view === "monthly" ? year : null,
        labels: buckets.map((b) => b.label),
        income,
        receivedAmount,
        dueAmount,
        orderCount,
        repairingIncome, // ✅ NEW: frontend chart mein use kar sakte ho
        summary: {
          totalIncome,
          totalReceived,
          totalDue,
          totalOrders,
          avgOrderValue,
          bestPeriod,
          totalRepairingIncome, // ✅ NEW
          // Breakdown for frontend
          orderIncome:     totalIncome - totalRepairingIncome,
          repairingIncome: totalRepairingIncome,
        },
      },
    }), { status: 200 });

  } catch (err) {
    console.error("Income API error:", err);
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