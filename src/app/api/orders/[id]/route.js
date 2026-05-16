// app/api/orders/[id]/route.js
import { connectDB }   from "@/lib/db";
import Orders          from "@/app/api/orders/models/orders";
import { verifyAdmin } from "@/app/api/middleware/auth";

// GET /api/orders/[id] — Single order fetch
export const GET = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const order = await Orders.findById(id);
    if (!order) {
      return Response.json(
        { success: false, error: "Order nahi mila" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: order }, { status: 200 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

export const PATCH = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const body = await req.json();
    const { customer, orders } = body;

    const order = await Orders.findById(id);
    if (!order) {
      return Response.json(
        { success: false, error: "Order nahi mila" },
        { status: 404 }
      );
    }

    const hasNonPending = order.orders.some(
      o => o.status === "Completed"
    );
    if (hasNonPending) {
      return Response.json(
        { success: false, error: "Completed orders edit nahi ho sakte" },
        { status: 400 }
      );
    }

    // ── Customer info update ──────────────────────────────────────
    if (customer) {
      if (customer.name    !== undefined) order.customer.name    = customer.name.trim();
      if (customer.phone   !== undefined) order.customer.phone   = String(customer.phone).trim();
      if (customer.address !== undefined) order.customer.address = customer.address;
    }

    // ── Order items update ────────────────────────────────────────
    if (orders && Array.isArray(orders)) {
      // Har order item ko orderId se match karke update karo
      orders.forEach((updatedOrder) => {
        const idx = order.orders.findIndex(
          o => o.orderId === updatedOrder.orderId
        );
        if (idx === -1) return; // orderId nahi mila — skip

        const current = order.orders[idx];
        // Sirf allowed fields update karo
        const allowed = [
          "height", "width", "perKgRate", "extraCharge",
          "amount", "description", "metalType", "itemType",
          "orderType", "date"
        ];
        allowed.forEach(field => {
          if (updatedOrder[field] !== undefined) {
            current[field] = updatedOrder[field];
          }
        });
        order.orders[idx] = current;
      });

      // Mongoose ko bataao ki orders array change hua
      order.markModified("orders");
    }

    await order.save();

    return Response.json({
      success: true,
      message: "Order update ho gaya",
      data:    order,
    }, { status: 200 });

  } catch (err) {
    console.error("Order PATCH error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

export const DELETE = verifyAdmin(async (req, context) => {
  try {
    await connectDB();
    const { id } = await context.params;

    const order = await Orders.findById(id);
    if (!order) {
      return Response.json(
        { success: false, error: "Order nahi mila" },
        { status: 404 }
      );
    }

    const isPartiallyPaid = order.orders.some(
      o => o.status === "Partially Completed"
    );
    if (isPartiallyPaid) {
      return Response.json(
        {
          success: false,
          error:   "Partially paid order cancel nahi ho sakta — customer ne pehle se payment di hai. Admin se baat karo.",
        },
        { status: 400 }
      );
    }

    // Completed orders bhi delete nahi hote
    const isCompleted = order.orders.some(o => o.status === "Completed");
    if (isCompleted) {
      return Response.json(
        { success: false, error: "Completed order cancel nahi ho sakta" },
        { status: 400 }
      );
    }

    const customerName = order.customer?.name || "Unknown";
    await Orders.findByIdAndDelete(id);

    return Response.json({
      success: true,
      message: `${customerName} ka order cancel ho gaya`,
      data:    { _id: id, customerName },
    }, { status: 200 });

  } catch (err) {
    console.error("Order DELETE error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});