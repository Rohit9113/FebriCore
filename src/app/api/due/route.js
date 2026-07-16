// app/api/due/route.js
import { connectDB }   from "@/lib/db";
import CustomerDue     from "./models/CustomerDue";
import { verifyAdmin } from "@/app/api/middleware/auth";
import { validateAndProcessItems } from "./itemUtils";

// ── GET /api/due ──────────────────────────────────────────────────
export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // due | partial | paid | all
    const search = searchParams.get("search"); // name/phone search

    const query = {};
    if (status && status !== "all") query.status = status;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await CustomerDue
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Summary stats
    const all = await CustomerDue.find({}).lean();
    const stats = {
      totalCustomers: all.length,
      totalDue:       all.reduce((s, c) => s + (c.dueAmount   || 0), 0),
      totalPaid:      all.reduce((s, c) => s + (c.paidAmount  || 0), 0),
      totalBusiness:  all.reduce((s, c) => s + (c.totalAmount || 0), 0),
      dueCount:       all.filter(c => c.status === "due").length,
      partialCount:   all.filter(c => c.status === "partial").length,
      paidCount:      all.filter(c => c.status === "paid").length,
    };

    return Response.json({
      success: true,
      count: customers.length,
      stats,
      data: customers,
    }, { status: 200 });

  } catch (err) {
    console.error("Due GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ── POST /api/due ─────────────────────────────────────────────────
export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const body = await req.json();
    const { name, phone, address, description, items, workDate } = body;

    if (!name || !phone) {
      return Response.json(
        { success: false, error: "Name aur phone required hain" },
        { status: 400 }
      );
    }

    // Weight x rate/kg, ya fixed contract amount — dono support hain
    const { items: processedItems, error: itemsError } = validateAndProcessItems(items);
    if (itemsError) {
      return Response.json({ success: false, error: itemsError }, { status: 400 });
    }

    const totalAmount = processedItems.reduce((s, i) => s + i.total, 0);

    const customer = await CustomerDue.create({
      name:        name.trim(),
      phone:       String(phone).trim(),
      address:     address?.trim() || "",
      description: description?.trim() || "",
      items:       processedItems,
      totalAmount,
      paidAmount:  0,
      dueAmount:   totalAmount,
      payments:    [],
      workDate:    workDate || new Date().toISOString().split("T")[0],
      createdBy:   req.admin?._id || null,
    });

    return Response.json({
      success: true,
      message: `${name} ka due entry ho gaya`,
      data: customer,
    }, { status: 201 });

  } catch (err) {
    console.error("Due POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});