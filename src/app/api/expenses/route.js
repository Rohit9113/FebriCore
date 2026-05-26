//app/api/expenses/route.js
import { connectDB }   from "@/lib/db";
import Expense         from "@/app/api/expenses/models/Expense";
import { verifyAdmin } from "@/app/api/middleware/auth";

const VALID_CATEGORIES = ["Hardware", "Diesel", "Petrol", "Transport", "Other"];

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

    if (!VALID_CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid category. Allowed: ${VALID_CATEGORIES.join(", ")}`,
      }), { status: 400 });
    }

    const expense = await Expense.create({
      category,
      desc,
      qty:       qty    ? Number(qty)    : 1,
      unit:      unit   || "pcs",
      rate:      rate   ? Number(rate)   : 0,
      amount:    Number(amount),
      date,
      createdBy: admin._id,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Expense successfully add ho gaya",
      data:    expense,
    }), { status: 201 });

  } catch (err) {
    console.error("Expense POST error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});

export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const month    = searchParams.get("month");
    const sort     = searchParams.get("sort") === "asc" ? 1 : -1;

    const query = {};

    if (category && category !== "All") {
      query.category = category;
    }

    if (month) {
      query.date = { $regex: `^${month}` };
    }

    const expenses = await Expense.find(query).sort({ date: sort });

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    return new Response(JSON.stringify({
      success: true,
      total:   totalAmount,
      count:   expenses.length,
      data:    expenses,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});