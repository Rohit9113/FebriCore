//app/api/expenses/route.js
import { connectDB } from "@/lib/db";
import Expense from "@/app/api/expenses/models/Expense";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();
    const admin = req.admin;

    const { category, desc, qty, unit, rate, amount, date } = await req.json();

    if (!category || !desc || !amount || !date) {
      return new Response(JSON.stringify({
        success: false,
        error: "category, desc, amount aur date required hain",
      }), { status: 400 });
    }

    const expense = await Expense.create({
      type: "goods",
      category,
      desc,
      qty: qty || 1,
      unit: unit || "pcs",
      rate: rate || 0,
      amount: Number(amount),
      date,
      createdBy: admin._id,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Expense successfully add ho gaya",
      data: expense,
    }), { status: 201 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});

// GET  /api/expenses
export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const month    = searchParams.get("month");  
    const sort     = searchParams.get("sort") === "asc" ? 1 : -1;

    const query = { $or: [{ type: "goods" }, { type: { $exists: false } }, { type: null }] };

    if (category && category !== "All") {
      query.category = category;
    }

    if (month) {
      // Match dates that start with "YYYY-MM"
      query.date = { $regex: `^${month}` };
    }

    const expenses = await Expense.find(query).sort({ date: sort });

    // Summary totals
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    return new Response(JSON.stringify({
      success: true,
      total: totalAmount,
      count: expenses.length,
      data: expenses,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});