//app/api/orders/route.js
import { connectDB } from "@/lib/db";
import Orders from "./models/orders";   // ✅ Now using Orders
import { verifyAdmin } from "@/app/api/middleware/auth";

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

    // Find existing customer
    let existingCustomer = null;
    if (customer?.phone) {
      existingCustomer = await Orders.findOne({ "customer.phone": customer.phone });
    }

    const lastOrderId = existingCustomer
      ? (existingCustomer.orders.at(-1)?.orderId || 0)
      : 0;

    const finalOrders = orders.map((o, i) => ({
      ...o,
      status: "Pending",
      orderType,
      orderId: lastOrderId + (i + 1),
    }));

    let record;

    if (existingCustomer) {
      existingCustomer.orders.push(...finalOrders);
      await existingCustomer.save();
      record = existingCustomer;
    } else {
      record = await Orders.create({
        customer,
        orders: finalOrders,
        createdBy: admin._id,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Order created successfully",
      data: record,
    }), { status: 201 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});


// ------------------------------
// GET ALL PENDING ORDERS
// ------------------------------
export const GET = verifyAdmin(async () => {
  try {
    await connectDB();

    const pending = await Orders.find({ "orders.status": "Pending" });

    return new Response(JSON.stringify({
      success: true,
      data: pending,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), { status: 500 });
  }
});
