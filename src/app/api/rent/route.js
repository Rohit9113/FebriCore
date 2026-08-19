// app/api/rent/route.js
import { connectDB }   from "@/lib/db";
import { verifyAdmin } from "@/app/api/middleware/auth";
import { getMonthsSummary } from "./rentUtils";
import { getRentDoc } from "./getRentDoc";

// ── GET /api/rent ────────────────────────────────────────────────
export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();
    const rent = await getRentDoc();

    const { searchParams } = new URL(req.url);
    const monthsBack = Number(searchParams.get("months")) || 12;
    const months = getMonthsSummary(rent, monthsBack);

    const totalPaidAllTime = (rent.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const totalDueVisible  = months.reduce((s, m) => s + m.due, 0);

    return Response.json({
      success: true,
      data: {
        settings: {
          _id:             rent._id,
          landlordName:    rent.landlordName,
          landlordPhone:   rent.landlordPhone,
          propertyAddress: rent.propertyAddress,
          dueDay:          rent.dueDay,
          rentStartMonth:  rent.rentStartMonth,
          monthlyRent:     rent.monthlyRent,
          rentHistory:     rent.rentHistory,
        },
        months,
        stats: {
          totalPaidAllTime,
          totalDueVisible,
          currentMonthStatus: months.find((m) => m.month === months[0]?.month)?.status || "pending",
        },
        payments: [...rent.payments].sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1)),
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Rent GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

export const PATCH = verifyAdmin(async (req) => {
  try {
    await connectDB();
    const rent = await getRentDoc();
    const body = await req.json();

    const {
      landlordName, landlordPhone, propertyAddress, dueDay,
      rentStartMonth, monthlyRent, effectiveDate, reason,
    } = body;

    if (landlordName    !== undefined) rent.landlordName    = landlordName.trim();
    if (landlordPhone   !== undefined) rent.landlordPhone   = landlordPhone.trim();
    if (propertyAddress !== undefined) rent.propertyAddress = propertyAddress.trim();
    if (dueDay) rent.dueDay = Math.min(28, Math.max(1, Number(dueDay)));
    if (rentStartMonth && /^\d{4}-\d{2}$/.test(rentStartMonth)) rent.rentStartMonth = rentStartMonth;

    if (monthlyRent && Number(monthlyRent) > 0 && Number(monthlyRent) !== rent.monthlyRent) {
      const newAmount = Number(monthlyRent);
      const from = effectiveDate || new Date().toISOString().split("T")[0];

      if (rent.rentHistory.length === 0 && rent.monthlyRent > 0) {
        rent.rentHistory.push({
          amount: rent.monthlyRent,
          from:   rent.createdAt ? rent.createdAt.toISOString().split("T")[0] : from,
          reason: "Initial Rent",
        });
      }

      const existingIdx = rent.rentHistory.findIndex((h) => h.from === from);
      if (existingIdx !== -1) {
        rent.rentHistory[existingIdx].amount = newAmount;
        rent.rentHistory[existingIdx].reason = reason || "Rent Update";
      } else {
        rent.rentHistory.push({ amount: newAmount, from, reason: reason || "Rent Update" });
      }
      rent.rentHistory.sort((a, b) => new Date(a.from) - new Date(b.from));
      rent.markModified("rentHistory");
      rent.monthlyRent = newAmount;
    }

    await rent.save();

    return Response.json({
      success: true,
      message: "Rent settings update ho gaye",
      data: rent,
    }, { status: 200 });

  } catch (err) {
    console.error("Rent PATCH error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});