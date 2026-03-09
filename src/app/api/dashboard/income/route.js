import { connectDB }   from "@/lib/db";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// GET  /api/dashboard/income
// ?view=monthly&year=2025  |  ?view=yearly&years=5
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

    // Fetch all completed orders
    const orders = await CompletedOrder.find({}).lean();

    console.log("Total completed orders found:", orders.length);

    // ── Normalize → { date, totalAmount, receivedAmount, dueAmount }
    // FIX: handle both old (finalAmount) and new (totalAmount) field names
    // FIX: strip time from ISO date strings like "2025-03-05T10:30:00.000Z"
    const items = orders.map((o) => {
      const p = o.paymentReceive || {};

      // Date: completedDate can be full ISO or YYYY-MM-DD, fallback to createdAt
      const rawDate = p.completedDate || o.createdAt;
      const date = toDateOnly(rawDate);

      // DB mein: finalAmount = received amount, dueAmount = baaki
      // total sale = finalAmount + dueAmount
      const receivedAmount = Number(p.finalAmount || p.receivedAmount || 0);
      const dueAmount      = Number(p.dueAmount   || 0);
      const totalAmount    = receivedAmount + dueAmount;

      console.log(`Order: date=${date}, total=${totalAmount}, received=${receivedAmount}`);

      return { date, totalAmount, receivedAmount, dueAmount };
    });

    // ── Per-bucket aggregation
    const income         = [];
    const receivedAmount = [];
    const dueAmount      = [];
    const orderCount     = [];

    buckets.forEach(({ start, end }) => {
      const filtered = items.filter((i) => i.date >= start && i.date <= end);
      income.push(        filtered.reduce((s, i) => s + i.totalAmount,    0));
      receivedAmount.push(filtered.reduce((s, i) => s + i.receivedAmount, 0));
      dueAmount.push(     filtered.reduce((s, i) => s + i.dueAmount,      0));
      orderCount.push(    filtered.length);
    });

    // ── Summary
    const totalIncome   = income.reduce((a, b) => a + b, 0);
    const totalReceived = receivedAmount.reduce((a, b) => a + b, 0);
    const totalDue      = dueAmount.reduce((a, b) => a + b, 0);
    const totalOrders   = orderCount.reduce((a, b) => a + b, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalIncome / totalOrders) : 0;

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
        summary: {
          totalIncome,
          totalReceived,
          totalDue,
          totalOrders,
          avgOrderValue,
          bestPeriod,
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

// "2025-03-05T10:30:00.000Z" → "2025-03-05"
// "2025-03-05" → "2025-03-05"
// Date object → "2025-03-05"
const toDateOnly = (d) => {
  if (!d) return "";
  const str = d instanceof Date ? d.toISOString() : String(d);
  // Take only first 10 characters: "YYYY-MM-DD"
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