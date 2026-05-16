// app/api/orders/route.js
import { connectDB }   from "@/lib/db";
import Orders          from "./models/orders";
import { verifyAdmin } from "@/app/api/middleware/auth";

// POST  /api/orders
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

    let existingCustomer = null;
    if (customer?.phone) {
      existingCustomer = await Orders.findOne({
        "customer.phone": customer.phone,
      });
    }
    const lastOrderId = existingCustomer
      ? Math.max(0, ...existingCustomer.orders.map((o) => o.orderId || 0))
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

// GET  /api/orders — pending + partially completed orders
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