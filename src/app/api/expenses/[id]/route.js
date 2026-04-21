//app/api/expenses/[id]/route.js

import { connectDB } from "@/lib/db";
import Expense from "../models/Expense";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────
// PATCH  /api/expenses/[id]
// ─────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();

    const { id } = await context.params; // ✅ Next.js 15 — await required

    const body = await req.json();
    const allowedFields = ["category", "desc", "qty", "unit", "rate", "amount", "date"];

    const updates = {};
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field];
    });

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Koi bhi update field nahi mila",
      }), { status: 400 });
    }

    const updated = await Expense.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return new Response(JSON.stringify({
        success: false,
        error: "Expense nahi mila",
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Expense update ho gaya",
      data: updated,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});

// ─────────────────────────────────────────────
// DELETE  /api/expenses/[id]
// ✅ FIX: params ko await karo — Next.js 15 mein params async hai
// Pehle: const { id } = params        ← CRASH in Next.js 15
// Ab:    const { id } = await context.params  ← CORRECT
// ─────────────────────────────────────────────
export const DELETE = verifyAdmin(async (req, context) => {
  try {
    await connectDB();

    const { id } = await context.params; // ✅ FIXED — was: const { id } = params

    const deleted = await Expense.findByIdAndDelete(id);

    if (!deleted) {
      return new Response(JSON.stringify({
        success: false,
        error: "Expense nahi mila",
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Expense delete ho gaya",
      data: { _id: id },
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});