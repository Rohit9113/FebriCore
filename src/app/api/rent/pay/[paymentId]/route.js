// app/api/rent/pay/[paymentId]/route.js
import { connectDB }   from "@/lib/db";
import { verifyAdmin } from "@/app/api/middleware/auth";
import { getRentDoc }  from "@/app/api/rent/getRentDoc";

// ── PATCH /api/rent/pay/[paymentId] — payment entry edit karo ─────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { paymentId } = await context.params;
    const body = await req.json();

    const rent = await getRentDoc();

    const payment = rent.payments.id(paymentId);
    if (!payment) {
      return Response.json({ success: false, error: "Payment nahi mila" }, { status: 404 });
    }

    if (body.forMonth && /^\d{4}-\d{2}$/.test(body.forMonth)) payment.forMonth = body.forMonth;
    if (body.amount !== undefined && Number(body.amount) > 0) payment.amount = Number(body.amount);
    if (body.paidOn) payment.paidOn = body.paidOn;
    if (body.reason !== undefined) payment.reason = body.reason?.trim() || "";
    if (body.note   !== undefined) payment.note   = body.note?.trim()   || "";

    await rent.save();

    return Response.json({
      success: true,
      message: "Payment update ho gaya",
      data: rent,
    }, { status: 200 });

  } catch (err) {
    console.error("Rent pay PATCH error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ── DELETE /api/rent/pay/[paymentId] ────────────────────────────────
export const DELETE = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { paymentId } = await context.params;

    const rent = await getRentDoc();

    const payment = rent.payments.id(paymentId);
    if (!payment) {
      return Response.json({ success: false, error: "Payment nahi mila" }, { status: 404 });
    }

    payment.deleteOne();
    await rent.save();

    return Response.json({
      success: true,
      message: "Payment delete ho gaya",
      data: rent,
    }, { status: 200 });

  } catch (err) {
    console.error("Rent pay DELETE error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});