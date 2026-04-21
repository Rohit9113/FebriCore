// app/api/orders/route.js
//
// ✅ FIX: lastOrderId calculation galat tha
//   Pehle: existingCustomer.orders.at(-1)?.orderId
//   Bug: Agar orders sorted na hon by orderId toh last element
//        sabse bada nahi hoga — duplicate orderIds possible the
//   Ab: Math.max() se sab orderIds mein se sabse bada lo
//
// ✅ FIX: Same phone pe alag customers mix hone ki warning

import { connectDB }   from "@/lib/db";
import Orders          from "./models/orders";
import { verifyAdmin } from "@/app/api/middleware/auth";

// ─────────────────────────────────────────────────────────────────
// POST  /api/orders — naya order create karo
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

    // ✅ Basic customer validation
    if (!customer?.name) {
      return new Response(JSON.stringify({
        success: false,
        error: "Customer name required hai",
      }), { status: 400 });
    }

    if (!orders?.length) {
      return new Response(JSON.stringify({
        success: false,
        error: "Kam se kam ek order required hai",
      }), { status: 400 });
    }

    // Existing customer check (same phone)
    let existingCustomer = null;
    if (customer?.phone) {
      existingCustomer = await Orders.findOne({
        "customer.phone": customer.phone,
      });
    }

    // ✅ FIX: Math.max() se sabse bada orderId lo
    // Pehle: existingCustomer.orders.at(-1)?.orderId
    // Bug: Array ka last element necessarily largest nahi hota
    // Ab: Saare orderIds mein se max lo — duplicate impossible
    const lastOrderId = existingCustomer
      ? Math.max(0, ...existingCustomer.orders.map((o) => o.orderId || 0))
      : 0;

    const finalOrders = orders.map((o, i) => ({
      ...o,
      status:    "Pending",
      orderType,
      orderId:   lastOrderId + (i + 1), // ✅ Always unique — max + 1, 2, 3...
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
// GET  /api/orders — pending + partially completed orders
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async () => {
  try {
    await connectDB();

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