// app/api/goods/[id]/route.js
//
// ✅ NEW Feature 13: Goods Edit + Delete
//
// PATCH /api/goods/[id] — Edit karo (size, rate, kg, date)
// DELETE /api/goods/[id] — Delete karo (permanent)

import { connectDB }   from "@/lib/db";
import Goods           from "@/app/api/goods/model";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// PATCH /api/goods/[id]
// ─────────────────────────────────────────────────────────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const body    = await req.json();
    const allowed = ["size", "perKgRate", "totalKg", "date", "materialType"];
    const updates = {};
    allowed.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });

    if (Object.keys(updates).length === 0) {
      return Response.json({ success: false, error: "Koi update field nahi mila" }, { status: 400 });
    }
    if (updates.perKgRate !== undefined && Number(updates.perKgRate) <= 0)
      return Response.json({ success: false, error: "Rate zero ya negative nahi ho sakta" }, { status: 400 });
    if (updates.totalKg !== undefined && Number(updates.totalKg) <= 0)
      return Response.json({ success: false, error: "Total kg zero ya negative nahi ho sakta" }, { status: 400 });

    const goods = await Goods.findById(id);
    if (!goods) return Response.json({ success: false, error: "Goods entry nahi mili" }, { status: 404 });

    Object.assign(goods, updates);
    await goods.save(); // pre-save hook se totalAmount auto-recalculate hoga

    return Response.json({ success: true, message: "Goods update ho gaya", data: goods }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/goods/[id]
// ─────────────────────────────────────────────────────────────────
export const DELETE = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const deleted = await Goods.findByIdAndDelete(id);
    if (!deleted) return Response.json({ success: false, error: "Goods entry nahi mili" }, { status: 404 });

    return Response.json({
      success: true,
      message: `${deleted.materialType} goods entry delete ho gaya`,
      data:    { _id: id },
    }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});