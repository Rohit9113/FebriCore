
// app/api/repairing/route.js
import { connectDB } from "@/lib/db";
import Repairing from "./models/Repairing";
import { verifyAdmin } from "@/app/api/middleware/auth";

// Helper: today's date YYYY-MM-DD
const getToday = () => {
  return new Date().toISOString().substring(0, 10);
};

// ─────────────────────────────────────────────
// POST /api/repairing
// Simple entry: amount + description
// ─────────────────────────────────────────────
export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const body = await req.json();
    const { amount, description } = body;

    if (!amount) {
      return Response.json(
        { success: false, error: "Amount required" },
        { status: 400 }
      );
    }

    const record = await Repairing.create({
      amount: Number(amount),
      description: description || "",
      date: getToday(),
      createdBy: req.admin._id,
    });

    return Response.json(
      {
        success: true,
        message: "Repairing entry added",
        data: record,
      },
      { status: 201 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});

// ─────────────────────────────────────────────
// GET /api/repairing
// All repairing entries (latest first)
// ─────────────────────────────────────────────
export const GET = verifyAdmin(async () => {
  try {
    await connectDB();

    const data = await Repairing.find()
      .sort({ createdAt: -1 })
      .lean();

    const total = data.reduce((sum, r) => sum + (r.amount || 0), 0);

    return Response.json(
      {
        success: true,
        data,
        summary: {
          totalAmount: total,
          totalEntries: data.length,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});