// app/api/orders/due-payment/route.js
//
// ✅ NEW: Due Payment Route
//
// Yeh route specifically un orders ke liye hai jo
// already "Partially Completed" hain aur sirf baaki amount collect karna hai
//
// Rules:
//   - Sirf date + receivedAmount chahiye (weight/rate dobara nahi)
//   - Agar receivedAmount >= currentDue → order CompletedOrder mein move
//   - Agar receivedAmount < currentDue  → order Partial mein rehta hai
//                                         dueAmount update ho jaata hai
//   - Overpayment allowed (>= due is fine)
//   - Underpayment NOT completed (< due stays partial)

import { connectDB }   from "@/lib/db";
import Orders          from "../models/orders";
import CompletedOrder  from "../models/CompletedOrder";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const PATCH = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { orderGroupId, receivedAmount, paymentDate } = await req.json();

    // ── Validation ────────────────────────────────────────────────
    if (!orderGroupId) {
      return Response.json(
        { success: false, error: "orderGroupId required hai" },
        { status: 400 }
      );
    }

    const received = Number(receivedAmount);
    if (!received || received <= 0) {
      return Response.json(
        { success: false, error: "Amount required hai aur zero se zyada hona chahiye" },
        { status: 400 }
      );
    }

    const order = await Orders.findById(orderGroupId);
    if (!order) {
      return Response.json(
        { success: false, error: "Order nahi mila" },
        { status: 404 }
      );
    }

    // ── Sirf Partially Completed orders allowed ───────────────────
    const isPartial = order.orders.some(o => o.status === "Partially Completed");
    if (!isPartial) {
      return Response.json(
        { success: false, error: "Yeh order partially completed nahi hai" },
        { status: 400 }
      );
    }

    // ── Current due amount — latest paymentHistory se lo ─────────
    const paymentHistory  = order.paymentHistory || [];
    const latestPayment   = paymentHistory.at(-1);

    if (!latestPayment) {
      return Response.json(
        { success: false, error: "Payment history nahi mili — pehle order complete karo" },
        { status: 400 }
      );
    }

    const currentDue      = Number(latestPayment.dueAmount) || 0;
    const totalSaleAmount = Number(latestPayment.totalAmount) || 0;

    // ── Previously received amount ────────────────────────────────
    const previouslyReceived = paymentHistory.reduce(
      (sum, p) => sum + (Number(p.finalAmount) || Number(p.receivedAmount) || 0),
      0
    );

    const today = paymentDate || new Date().toISOString().split("T")[0];

    // ── New due = currentDue - received (min 0) ───────────────────
    const newDue          = Math.max(0, currentDue - received);
    const totalReceived   = previouslyReceived + received;

    // ── New payment entry ─────────────────────────────────────────
    const newPaymentEntry = {
      completedDate:     today,
      entries:           latestPayment.entries || [],   // same entries — weight/rate nahi badla
      totalAmount:       totalSaleAmount,
      finalAmount:       received,
      receivedAmount:    received,
      dueAmount:         newDue,
      materialUsage:     latestPayment.materialUsage     || [],
      totalMaterialCost: latestPayment.totalMaterialCost || 0,
      grossProfit:       latestPayment.grossProfit       || 0,
      previouslyReceived,
      totalReceivedTillNow: totalReceived,
    };

    // ────────────────────────────────────────────────────────────
    // CASE 1: receivedAmount >= currentDue → FULLY PAID
    //         Order CompletedOrder mein move karo
    // ────────────────────────────────────────────────────────────
    if (received >= currentDue) {

      const fullPaymentEntry = {
        ...newPaymentEntry,
        dueAmount:      0,
        finalAmount:    totalReceived,    // total across ALL payments
        receivedAmount: totalReceived,
        paymentHistory: [...paymentHistory, newPaymentEntry],
      };

      await CompletedOrder.create({
        customer:  order.customer.toObject
          ? order.customer.toObject()
          : order.customer,
        orders: order.orders.map(o => ({
          ...(o.toObject ? o.toObject() : o),
          status: "Completed",
        })),
        paymentReceive: fullPaymentEntry,
        createdBy: order.createdBy,
      });

      await Orders.findByIdAndDelete(orderGroupId);

      return Response.json({
        success:          true,
        movedToCompleted: true,
        message:          `Order complete ho gaya! 🎉 Total mila: ₹${totalReceived.toLocaleString("en-IN")}`,
        data: {
          received,
          newDue:        0,
          totalReceived,
          totalSaleAmount,
        },
      }, { status: 200 });
    }

    // ────────────────────────────────────────────────────────────
    // CASE 2: receivedAmount < currentDue → STILL PARTIAL
    //         paymentHistory update karo, order wahi rehta hai
    // ────────────────────────────────────────────────────────────
    order.paymentHistory.push(newPaymentEntry);
    order.lastPayment = newPaymentEntry; // backward compat

    await order.save();

    return Response.json({
      success:          true,
      movedToCompleted: false,
      message:          `₹${received.toLocaleString("en-IN")} receive hua. Baaki due: ₹${newDue.toLocaleString("en-IN")}`,
      data: {
        received,
        newDue,
        totalReceived,
        totalSaleAmount,
        previouslyReceived,
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Due payment error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});