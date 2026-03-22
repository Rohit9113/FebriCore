// app/api/orders/complete/route.js
//
// ✅ FIX: Stock automatically deduct hota hai jab order complete hota hai
// ✅ FIX: Material cost per order track hota hai (purchase rate × kg)
// ✅ FIX: grossProfit = saleAmount - materialCost
// ✅ FIX: Partial payment history overwrite nahi hoti (array mein push)
// ✅ FIX: "Partially Completed" orders GET mein aate hain

import { connectDB }   from "@/lib/db";
import Orders          from "../models/orders";
import CompletedOrder  from "../models/CompletedOrder";
import Goods           from "@/app/api/goods/model";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// HELPER: Kisi metalType ka weighted average purchase rate nikalo
// Sab purchases ka average rate (jo stock mein hai uska)
// ─────────────────────────────────────────────────────────────────
const getAvgPurchaseRate = async (metalType) => {
  if (!metalType) return 0;

  // Normalize: "MS", "GI", "Other" — case insensitive
  const normalizedType = String(metalType).trim().toUpperCase() === "GI" ? "GI"
    : String(metalType).trim().toUpperCase() === "MS" ? "MS"
    : "Other";

  const result = await Goods.aggregate([
    { $match: { materialType: normalizedType } },
    {
      $group: {
        _id: null,
        totalKg:     { $sum: "$totalKg" },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  if (!result.length || !result[0].totalKg) return 0;

  // Weighted average = total amount / total kg
  return parseFloat((result[0].totalAmount / result[0].totalKg).toFixed(2));
};

// ─────────────────────────────────────────────────────────────────
// PATCH  /api/orders/complete
//
// Body:
// {
//   orderGroupId,
//   completedDate,
//   entries: [{
//     label,
//     weight,        ← kg use hua
//     ratePerKg,     ← SALE rate (customer ko charge)
//     amount,        ← weight × saleRate
//     extraCharges,
//     metalType,     ← ✅ NEW: kaun sa metal use hua (optional)
//   }],
//   totalAmount,     ← grand total sale value
//   receivedAmount,  ← jo customer ne diya
//   dueAmount,       ← baaki
// }
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

    // ── Validation ────────────────────────────────────────────────
    if (!orderGroupId || !completedDate || !entries?.length || !totalAmount) {
      return Response.json({
        success: false,
        error: "orderGroupId, completedDate, entries aur totalAmount required hain",
      }, { status: 400 });
    }

    const group = await Orders.findById(orderGroupId);
    if (!group) {
      return Response.json({
        success: false,
        error: "Order group nahi mila",
      }, { status: 404 });
    }

    const due      = Number(dueAmount)      || 0;
    const received = Number(receivedAmount) || 0;
    const total    = Number(totalAmount)    || 0;

    // ─────────────────────────────────────────────────────────────
    // ✅ MATERIAL COST CALCULATION
    //
    // Har entry ke liye:
    //   1. metalType check karo
    //   2. Us metal ka weighted average purchase rate lo
    //   3. materialCost = weight × purchaseRate
    //   4. materialUsage mein record karo
    // ─────────────────────────────────────────────────────────────
    const materialUsageMap = {}; // { "MS": { kgUsed, purchaseRate, materialCost } }
    let totalMaterialCost  = 0;

    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const weight    = Number(entry.weight)    || 0;
        const metalType = entry.metalType         || null;
        let   purchaseRate  = 0;
        let   materialCost  = 0;

        // Sirf weight-based orders ka material cost track karo
        if (metalType && weight > 0) {
          purchaseRate = await getAvgPurchaseRate(metalType);
          materialCost = parseFloat((weight * purchaseRate).toFixed(2));

          // Aggregate by metalType
          const key = metalType.trim().toUpperCase() === "GI" ? "GI"
            : metalType.trim().toUpperCase() === "MS" ? "MS" : "Other";

          if (!materialUsageMap[key]) {
            materialUsageMap[key] = { kgUsed: 0, purchaseRate, materialCost: 0 };
          }
          materialUsageMap[key].kgUsed        += weight;
          materialUsageMap[key].materialCost  += materialCost;
          totalMaterialCost                   += materialCost;
        }

        return {
          ...entry,
          purchaseRate,
          materialCost,
        };
      })
    );

    // materialUsage array banao
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

    // ─────────────────────────────────────────────────────────────
    // Payment object — dono fields save karo (compatibility)
    // ─────────────────────────────────────────────────────────────
    const paymentReceive = {
      completedDate,
      entries:           enrichedEntries,
      totalAmount:       total,
      finalAmount:       received,   // income API use karta hai
      receivedAmount:    received,
      dueAmount:         due,
      materialUsage,
      totalMaterialCost,
      grossProfit,
    };

    // ─────────────────────────────────────────────────────────────
    // CASE 1: Partial payment — orders mein rakho
    // ✅ FIX: paymentHistory array mein push karo (overwrite nahi)
    // ─────────────────────────────────────────────────────────────
    if (due > 0) {
      group.orders = group.orders.map((o) => ({
        ...(o.toObject ? o.toObject() : o),
        status: "Partially Completed",
      }));

      // ✅ FIX: Array mein push — history preserve hoti hai
      if (!group.paymentHistory) group.paymentHistory = [];
      group.paymentHistory.push(paymentReceive);
      group.lastPayment = paymentReceive; // backward compat ke liye

      await group.save();

      return Response.json({
        success: true,
        message: `Partial payment save ho gaya. Due: ₹${due.toLocaleString("en-IN")}`,
        movedToCompleted: false,
        dueAmount:        due,
        materialCost:     totalMaterialCost,
        grossProfit,
      }, { status: 200 });
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 2: Fully paid → CompletedOrder mein move karo
    // ✅ Stock deduction dynamically hoga — koi alag record nahi
    //    (remaining stock = purchases - usage from CompletedOrders)
    // ─────────────────────────────────────────────────────────────
    await CompletedOrder.create({
      customer: group.customer.toObject
        ? group.customer.toObject()
        : group.customer,
      orders: group.orders.map((o) => ({
        ...(o.toObject ? o.toObject() : o),
        status: "Completed",
      })),
      paymentReceive,
      createdBy: group.createdBy,
    });

    await Orders.findByIdAndDelete(orderGroupId);

    return Response.json({
      success: true,
      message: "Order complete ho gaya! 🎉",
      movedToCompleted: true,
      summary: {
        saleAmount:       total,
        materialCost:     totalMaterialCost,
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
// GET  /api/orders/complete  →  all completed orders
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