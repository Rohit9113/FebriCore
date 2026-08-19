// app/api/rent/pay/route.js
import { connectDB }   from "@/lib/db";
import { verifyAdmin } from "@/app/api/middleware/auth";
import { getRentDoc }  from "@/app/api/rent/getRentDoc";

// ── POST /api/rent/pay ──────────────────────────────────────────────
export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();
    const body = await req.json();
    const { forMonth, amount, paidOn, reason, note } = body;

    if (!forMonth || !/^\d{4}-\d{2}$/.test(forMonth)) {
      return Response.json(
        { success: false, error: "Month 'YYYY-MM' format mein required hai" },
        { status: 400 }
      );
    }
    if (!amount || Number(amount) <= 0) {
      return Response.json(
        { success: false, error: "Amount required hai aur zero se zyada hona chahiye" },
        { status: 400 }
      );
    }

    const rent = await getRentDoc();

    rent.payments.push({
      forMonth,
      amount:  Number(amount),
      paidOn:  paidOn || new Date().toISOString().split("T")[0],
      reason:  reason?.trim() || "",
      note:    note?.trim()   || "",
    });

    await rent.save();

    return Response.json({
      success: true,
      message: `${forMonth} ka rent record ho gaya`,
      data: rent,
    }, { status: 201 });

  } catch (err) {
    console.error("Rent pay POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});