// app/api/due/[id]/pay/route.js
import { connectDB }   from "@/lib/db";
import CustomerDue     from "@/app/api/due/models/CustomerDue";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ── POST /api/due/[id]/pay ────────────────────────────────────────
export const POST = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;
    const { amount, note } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return Response.json(
        { success: false, error: "Amount required hai aur zero se zyada hona chahiye" },
        { status: 400 }
      );
    }

    const customer = await CustomerDue.findById(id);
    if (!customer) {
      return Response.json(
        { success: false, error: "Customer nahi mila" },
        { status: 404 }
      );
    }

    if (customer.dueAmount <= 0) {
      return Response.json(
        { success: false, error: "Koi due nahi hai — poora paid ho chuka hai" },
        { status: 400 }
      );
    }

    const payAmt = Number(amount);
    if (payAmt > customer.dueAmount) {
      return Response.json(
        {
          success: false,
          error: `Payment ₹${payAmt} due ₹${customer.dueAmount} se zyada nahi ho sakta`,
        },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    customer.payments.push({
      amount: payAmt,
      paidOn: today,
      note:   note?.trim() || `₹${payAmt.toLocaleString("en-IN")} payment`,
    });

    customer.paidAmount += payAmt;
    await customer.save(); // pre-save hook updates dueAmount + status

    return Response.json({
      success: true,
      message: `₹${payAmt.toLocaleString("en-IN")} payment record ho gaya`,
      data: {
        totalAmount: customer.totalAmount,
        paidAmount:  customer.paidAmount,
        dueAmount:   customer.dueAmount,
        status:      customer.status,
        payments:    customer.payments,
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Due pay error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});