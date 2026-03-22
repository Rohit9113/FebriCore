// app/api/orders/route.js
// ✅ FIX: GET mein "Partially Completed" orders bhi aate hain
// ✅ FIX: Orders model mein paymentHistory array add kiya

import { connectDB }  from "@/lib/db";
import Orders         from "./models/orders";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// POST  /api/orders  — naya order create karo
// ─────────────────────────────────────────────────────────────────
export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();
    const admin = req.admin;

    const body = await req.json();
    const { orderType, customer, orders } = body;

    if (!orderType) {
      return new Response(JSON.stringify({
        success: false,
        error: "Order type required",
      }), { status: 400 });
    }

    // Existing customer check (same phone)
    let existingCustomer = null;
    if (customer?.phone) {
      existingCustomer = await Orders.findOne({
        "customer.phone": customer.phone,
      });
    }

    const lastOrderId = existingCustomer
      ? (existingCustomer.orders.at(-1)?.orderId || 0)
      : 0;

    const finalOrders = orders.map((o, i) => ({
      ...o,
      status:    "Pending",
      orderType,
      orderId:   lastOrderId + (i + 1),
    }));

    let record;
    if (existingCustomer) {
      existingCustomer.orders.push(...finalOrders);
      await existingCustomer.save();
      record = existingCustomer;
    } else {
      record = await Orders.create({
        customer,
        orders:    finalOrders,
        createdBy: admin._id,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Order create ho gaya",
      data:    record,
    }), { status: 201 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET  /api/orders  — pending + partially completed orders
// ✅ FIX: Dono status aate hain ab
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async () => {
  try {
    await connectDB();

    // ✅ FIX: Pehle sirf "Pending" aata tha — "Partially Completed" miss hota tha
    const pending = await Orders.find({
      "orders.status": { $in: ["Pending", "Partially Completed"] },
    }).sort({ createdAt: -1 });

    return new Response(JSON.stringify({
      success: true,
      data:    pending,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});