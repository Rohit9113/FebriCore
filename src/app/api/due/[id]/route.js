// app/api/due/[id]/route.js
import { connectDB }   from "@/lib/db";
import CustomerDue     from "@/app/api/due/models/CustomerDue";
import { verifyAdmin } from "@/app/api/middleware/auth";
import { validateAndProcessItems } from "@/app/api/due/itemUtils";

// ── GET /api/due/[id] ─────────────────────────────────────────────
export const GET = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const customer = await CustomerDue.findById(id).lean();
    if (!customer) {
      return Response.json(
        { success: false, error: "Customer nahi mila" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: customer }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ── PATCH /api/due/[id] — edit customer info + items ─────────────
export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await req.json();

    const customer = await CustomerDue.findById(id);
    if (!customer) {
      return Response.json(
        { success: false, error: "Customer nahi mila" },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (body.name)        customer.name        = body.name.trim();
    if (body.phone)       customer.phone       = String(body.phone).trim();
    if (body.address !== undefined) customer.address = body.address?.trim() || "";
    if (body.description !== undefined) customer.description = body.description?.trim() || "";
    if (body.workDate)    customer.workDate    = body.workDate;

    // Update items if provided — weight x rate/kg ya fixed contract amount
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const { items: processedItems, error: itemsError } = validateAndProcessItems(body.items);
      if (itemsError) {
        return Response.json({ success: false, error: itemsError }, { status: 400 });
      }
      customer.items = processedItems;
      customer.totalAmount = processedItems.reduce((s, i) => s + i.total, 0);
    }

    await customer.save(); // pre-save hook recalculates dueAmount + status

    return Response.json({
      success: true,
      message: "Customer update ho gaya",
      data: customer,
    }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ── DELETE /api/due/[id] ──────────────────────────────────────────
export const DELETE = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const customer = await CustomerDue.findByIdAndDelete(id);
    if (!customer) {
      return Response.json(
        { success: false, error: "Customer nahi mila" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: `${customer.name} ka record delete ho gaya`,
    }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});