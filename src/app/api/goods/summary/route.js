// app/api/goods/summary/route.js
//
// ✅ FIX: Remaining stock = Total Purchased - Total Used (from CompletedOrders)
// ✅ NEW: Per metal type: purchased, used, remaining
// ✅ NEW: Total investment value in stock

import { connectDB }   from "@/lib/db";
import Goods           from "@/app/api/goods/model";
import CompletedOrder  from "@/app/api/orders/models/CompletedOrder";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    // ── 1. Total purchased per metal type ────────────────────────
    const purchasedRaw = await Goods.aggregate([
      {
        $group: {
          _id:         "$materialType",
          totalKg:     { $sum: "$totalKg" },
          totalAmount: { $sum: "$totalAmount" }, // total investment
          avgRate:     { $avg: "$perKgRate" },
          // Weighted average rate
          totalKgForAvg: { $sum: "$totalKg" },
          totalAmtForAvg: { $sum: "$totalAmount" },
        },
      },
    ]);

    // ── 2. Total used per metal type (from completed orders) ──────
    const usedRaw = await CompletedOrder.aggregate([
      { $unwind: "$paymentReceive.materialUsage" },
      {
        $group: {
          _id:        "$paymentReceive.materialUsage.metalType",
          totalUsed:  { $sum: "$paymentReceive.materialUsage.kgUsed" },
          totalCost:  { $sum: "$paymentReceive.materialUsage.materialCost" },
        },
      },
    ]);

    // ── 3. Build lookup maps ──────────────────────────────────────
    const purchasedMap = {};
    purchasedRaw.forEach((item) => {
      purchasedMap[item._id] = {
        purchased:   item.totalKg     || 0,
        investment:  item.totalAmount || 0,
        avgRate:     item.totalKg > 0
          ? parseFloat((item.totalAmount / item.totalKg).toFixed(2))
          : 0,
      };
    });

    const usedMap = {};
    usedRaw.forEach((item) => {
      usedMap[item._id] = {
        used: item.totalUsed || 0,
        cost: item.totalCost || 0,
      };
    });

    // ── 4. Calculate remaining for each metal type ────────────────
    const METAL_TYPES = ["MS", "GI", "Other"];
    const breakdown   = {};

    METAL_TYPES.forEach((type) => {
      const p = purchasedMap[type] || { purchased: 0, investment: 0, avgRate: 0 };
      const u = usedMap[type]      || { used: 0, cost: 0 };

      const remaining       = Math.max(0, p.purchased - u.used);
      const remainingValue  = parseFloat((remaining * p.avgRate).toFixed(2));

      breakdown[type] = {
        purchased:      parseFloat(p.purchased.toFixed(3)),
        used:           parseFloat(u.used.toFixed(3)),
        remaining:      parseFloat(remaining.toFixed(3)),
        avgRate:        p.avgRate,
        investment:     parseFloat(p.investment.toFixed(2)),
        remainingValue: remainingValue, // current stock ka value
      };
    });

    // ── 5. Grand totals ───────────────────────────────────────────
    const totalPurchased     = METAL_TYPES.reduce((s, t) => s + breakdown[t].purchased,     0);
    const totalUsed          = METAL_TYPES.reduce((s, t) => s + breakdown[t].used,          0);
    const totalRemaining     = METAL_TYPES.reduce((s, t) => s + breakdown[t].remaining,     0);
    const totalInvestment    = METAL_TYPES.reduce((s, t) => s + breakdown[t].investment,    0);
    const totalRemainingValue= METAL_TYPES.reduce((s, t) => s + breakdown[t].remainingValue,0);

    // ── 6. Response ───────────────────────────────────────────────
    // Backward-compatible fields + new detailed breakdown
    return new Response(JSON.stringify({
      success: true,
      data: {
        // ── Backward compatible (existing frontend ke liye) ──────
        totalMS:     breakdown["MS"].remaining,
        totalGI:     breakdown["GI"].remaining,
        totalOthers: breakdown["Other"].remaining,
        totalStock:  parseFloat(totalRemaining.toFixed(3)),

        // ── ✅ NEW: Detailed breakdown ───────────────────────────
        breakdown,
        summary: {
          totalPurchased:      parseFloat(totalPurchased.toFixed(3)),
          totalUsed:           parseFloat(totalUsed.toFixed(3)),
          totalRemaining:      parseFloat(totalRemaining.toFixed(3)),
          totalInvestment:     parseFloat(totalInvestment.toFixed(2)),
          totalRemainingValue: parseFloat(totalRemainingValue.toFixed(2)),
        },
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Goods Summary Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});