import { connectDB }   from "@/lib/db";
import Orders          from "../models/orders";
import CompletedOrder  from "../models/CompletedOrder";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// PATCH  /api/orders/complete
//
// Body:
// {
//   orderGroupId,
//   completedDate,
//   entries: [{ label, weight, ratePerKg, amount, extraCharges[] }],
//   totalAmount,      ← grand total (amount + extraCharges)
//   receivedAmount,   ← jo customer ne diya
//   dueAmount,        ← baaki (0 = fully paid)
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

    // ── Validation ───────────────────────────────────────────────
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

    // ── Consistent paymentReceive object ────────────────────────
    // finalAmount  = received amount (jo actually mila)
    // totalAmount  = full sale value
    // dueAmount    = baaki
    const paymentReceive = {
      completedDate,
      entries,
      totalAmount:    total,
      finalAmount:    received,   // ← income API yahi use karta hai
      receivedAmount: received,   // ← dono field save karo compatibility ke liye
      dueAmount:      due,
    };

    // ── CASE 1: Partial payment ──────────────────────────────────
    if (due > 0) {
      group.orders = group.orders.map((o) => ({
        ...(o.toObject ? o.toObject() : o),
        status: "Partially Completed",
      }));
      group.lastPayment = paymentReceive;
      await group.save();

      return Response.json({
        success: true,
        message: `Partial payment save ho gaya. Due: ₹${due.toLocaleString("en-IN")}`,
        movedToCompleted: false,
        dueAmount: due,
      }, { status: 200 });
    }

    // ── CASE 2: Fully paid → move to CompletedOrder ──────────────
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
      message: "Order complete ho gaya!",
      movedToCompleted: true,
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