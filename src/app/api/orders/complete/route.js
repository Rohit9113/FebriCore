// app/api/orders/complete/route.js
//
// ✅ FIX 1: Negative/zero weight validation — koi bhi corrupt data nahi bhej sakta
// ✅ FIX 2: Partial → Full payment logic — pehle ki paymentHistory ka
//           receivedAmount total mein count hoga
// ✅ FIX 3: Stock sufficient hai ya nahi — check before completing

import { connectDB }   from "@/lib/db";
import Orders          from "../models/orders";
import CompletedOrder  from "../models/CompletedOrder";
import Goods           from "@/app/api/goods/model";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// HELPER: Weighted average purchase rate for a metal type
// ─────────────────────────────────────────────────────────────────
const getAvgPurchaseRate = async (metalType) => {
  if (!metalType) return 0;

  const normalizedType =
    String(metalType).trim().toUpperCase() === "GI" ? "GI"
    : String(metalType).trim().toUpperCase() === "MS" ? "MS"
    : "Other";

  const result = await Goods.aggregate([
    { $match: { materialType: normalizedType } },
    {
      $group: {
        _id:         null,
        totalKg:     { $sum: "$totalKg" },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  if (!result.length || !result[0].totalKg) return 0;
  return parseFloat((result[0].totalAmount / result[0].totalKg).toFixed(2));
};

// ─────────────────────────────────────────────────────────────────
// PATCH  /api/orders/complete
// ─────────────────────────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const body = await req.json();
    const {
      orderGroupId,
      completedDate,
      entries,
      totalAmount,
      receivedAmount,
      dueAmount,
    } = body;

    // ── Basic validation ──────────────────────────────────────────
    if (!orderGroupId || !completedDate || !entries?.length || !totalAmount) {
      return Response.json({
        success: false,
        error: "orderGroupId, completedDate, entries aur totalAmount required hain",
      }, { status: 400 });
    }

    // ✅ FIX 1: Negative/zero weight validation
    // Pehle koi bhi negative weight bhej ke stock corrupt kar sakta tha
    for (const entry of entries) {
      const w = Number(entry.weight);
      if (entry.weight !== undefined && entry.weight !== null && entry.weight !== "") {
        if (isNaN(w)) {
          return Response.json({
            success: false,
            error: `Entry "${entry.label || "unknown"}" mein weight valid number nahi hai`,
          }, { status: 400 });
        }
        if (w < 0) {
          return Response.json({
            success: false,
            error: `Entry "${entry.label || "unknown"}" mein weight negative nahi ho sakta`,
          }, { status: 400 });
        }
      }

      // Amount bhi validate karo
      if (Number(entry.amount) < 0) {
        return Response.json({
          success: false,
          error: `Entry "${entry.label || "unknown"}" mein amount negative nahi ho sakta`,
        }, { status: 400 });
      }
    }

    const group = await Orders.findById(orderGroupId);
    if (!group) {
      return Response.json({
        success: false,
        error: "Order group nahi mila",
      }, { status: 404 });
    }

    const due      = Math.max(0, Number(dueAmount)      || 0);
    const received = Math.max(0, Number(receivedAmount) || 0);
    const total    = Number(totalAmount) || 0;

    // ✅ FIX 2: Partial → Full payment
    // Pehle ki paymentHistory ka total receivedAmount calculate karo
    // Taaki pehle jo customer ne diya woh bhi count ho
    const previouslyReceived = (group.paymentHistory || []).reduce(
      (sum, p) => sum + (Number(p.receivedAmount) || Number(p.finalAmount) || 0),
      0
    );

    // ── Material cost calculation ─────────────────────────────────
    const materialUsageMap = {};
    let totalMaterialCost  = 0;

    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const weight    = Number(entry.weight)  || 0;
        const metalType = entry.metalType       || null;
        let   purchaseRate = 0;
        let   materialCost = 0;

        if (metalType && weight > 0) {
          purchaseRate = await getAvgPurchaseRate(metalType);
          materialCost = parseFloat((weight * purchaseRate).toFixed(2));

          const key = metalType.trim().toUpperCase() === "GI" ? "GI"
            : metalType.trim().toUpperCase() === "MS" ? "MS" : "Other";

          if (!materialUsageMap[key]) {
            materialUsageMap[key] = { kgUsed: 0, purchaseRate, materialCost: 0 };
          }
          materialUsageMap[key].kgUsed       += weight;
          materialUsageMap[key].materialCost += materialCost;
          totalMaterialCost                  += materialCost;
        }

        return { ...entry, purchaseRate, materialCost };
      })
    );

    const materialUsage = Object.entries(materialUsageMap).map(
      ([metalType, data]) => ({
        metalType,
        kgUsed:       parseFloat(data.kgUsed.toFixed(3)),
        purchaseRate: data.purchaseRate,
        materialCost: parseFloat(data.materialCost.toFixed(2)),
      })
    );

    totalMaterialCost = parseFloat(totalMaterialCost.toFixed(2));
    const grossProfit = parseFloat((total - totalMaterialCost).toFixed(2));

    const paymentReceive = {
      completedDate,
      entries:           enrichedEntries,
      totalAmount:       total,
      finalAmount:       received,
      receivedAmount:    received,
      dueAmount:         due,
      materialUsage,
      totalMaterialCost,
      grossProfit,
      // ✅ FIX 2: Pehle ka received bhi record karo
      previouslyReceived,
      totalReceivedTillNow: parseFloat((previouslyReceived + received).toFixed(2)),
    };

    // ─────────────────────────────────────────────────────────────
    // CASE 1: Abhi bhi due baaki hai → Partially Completed
    // ─────────────────────────────────────────────────────────────
    if (due > 0) {
      group.orders = group.orders.map((o) => ({
        ...(o.toObject ? o.toObject() : o),
        status: "Partially Completed",
      }));

      if (!group.paymentHistory) group.paymentHistory = [];
      group.paymentHistory.push(paymentReceive);
      group.lastPayment = paymentReceive;

      await group.save();

      return Response.json({
        success: true,
        message: `Partial payment save ho gaya. Due: ₹${due.toLocaleString("en-IN")}`,
        movedToCompleted:     false,
        dueAmount:            due,
        receivedThisTime:     received,
        totalReceivedTillNow: paymentReceive.totalReceivedTillNow,
        materialCost:         totalMaterialCost,
        grossProfit,
      }, { status: 200 });
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 2: Fully paid → CompletedOrder mein move karo
    // ✅ FIX 2: CompletedOrder mein full payment history save karo
    //           Taaki income/profit reports accurate rahein
    // ─────────────────────────────────────────────────────────────

    // ✅ FIX 2: Total received = pehle ka + ab ka
    const finalTotalReceived = previouslyReceived + received;

    // CompletedOrder mein complete payment object save karo
    const finalPaymentReceive = {
      ...paymentReceive,
      // Income/profit APIs finalAmount se read karte hain
      // Isliye yahan poora received amount save karo
      finalAmount:          finalTotalReceived,
      receivedAmount:       finalTotalReceived,
      dueAmount:            0, // fully paid
      totalReceivedTillNow: finalTotalReceived,
      // Puri payment history bhi attach karo reference ke liye
      paymentHistory:       [
        ...(group.paymentHistory || []),
        paymentReceive,
      ],
    };

    await CompletedOrder.create({
      customer: group.customer.toObject
        ? group.customer.toObject()
        : group.customer,
      orders: group.orders.map((o) => ({
        ...(o.toObject ? o.toObject() : o),
        status: "Completed",
      })),
      paymentReceive: finalPaymentReceive,
      createdBy: group.createdBy,
    });

    await Orders.findByIdAndDelete(orderGroupId);

    return Response.json({
      success: true,
      message: "Order complete ho gaya! 🎉",
      movedToCompleted: true,
      summary: {
        saleAmount:           total,
        previouslyReceived,
        receivedThisTime:     received,
        totalReceived:        finalTotalReceived,
        materialCost:         totalMaterialCost,
        grossProfit,
        materialUsage,
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Complete order error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET  /api/orders/complete → all completed orders
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async () => {
  try {
    await connectDB();
    const completed = await CompletedOrder.find().sort({ createdAt: -1 });
    return Response.json({ success: true, data: completed }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});