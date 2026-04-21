// app/api/repairing/[id]/route.js
//
// ✅ NEW Feature 14: Repairing Entry Edit + Delete
//
// PATCH  /api/repairing/[id] — Amount ya description edit karo
// DELETE /api/repairing/[id] — Entry permanently delete karo

import { connectDB }   from "@/lib/db";
import Repairing       from "@/app/api/repairing/models/Repairing";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// PATCH /api/repairing/[id] — Edit entry
//
// Body: { amount?, description?, date? }
// Rules:
//   - amount > 0 hona chahiye
//   - description optional hai
//   - date format YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const body = await req.json();
    const { amount, description, date } = body;

    // Kuch toh update karo
    if (amount === undefined && description === undefined && date === undefined) {
      return Response.json(
        { success: false, error: "Koi bhi update field nahi mila — amount, description ya date bhejo" },
        { status: 400 }
      );
    }

    // Amount validation
    if (amount !== undefined) {
      const amt = Number(amount);
      if (isNaN(amt) || amt <= 0) {
        return Response.json(
          { success: false, error: "Amount valid hona chahiye aur zero se zyada hona chahiye" },
          { status: 400 }
        );
      }
    }

    // Date format validation — YYYY-MM-DD
    if (date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return Response.json(
          { success: false, error: "Date format galat hai — YYYY-MM-DD hona chahiye" },
          { status: 400 }
        );
      }
    }

    const entry = await Repairing.findById(id);
    if (!entry) {
      return Response.json(
        { success: false, error: "Repairing entry nahi mili" },
        { status: 404 }
      );
    }

    // Apply updates
    if (amount      !== undefined) entry.amount      = Number(amount);
    if (description !== undefined) entry.description = String(description).trim();
    if (date        !== undefined) entry.date        = date;

    await entry.save();

    return Response.json({
      success: true,
      message: "Repairing entry update ho gaya",
      data:    entry,
    }, { status: 200 });

  } catch (err) {
    console.error("Repairing PATCH error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/repairing/[id] — Delete entry permanently
// ─────────────────────────────────────────────────────────────────
export const DELETE = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const deleted = await Repairing.findByIdAndDelete(id);
    if (!deleted) {
      return Response.json(
        { success: false, error: "Repairing entry nahi mili" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: `₹${deleted.amount.toLocaleString("en-IN")} wali repairing entry delete ho gayi`,
      data:    {
        _id:    id,
        amount: deleted.amount,
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Repairing DELETE error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});