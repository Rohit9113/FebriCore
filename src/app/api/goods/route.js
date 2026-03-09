//app/api/goods/route.js
import { connectDB } from "@/lib/db";
import Goods from "@/app/api/goods/model";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();
    const admin = req.admin;

    // Optional role check
    if (admin.role !== "SuperAdmin") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Forbidden: Only SuperAdmin can add goods",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { materialType, size, perKgRate, totalKg, date } = body;

    // Validation
    if (!materialType || !size || !perKgRate || !totalKg) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "All fields are required (materialType, size, perKgRate, totalKg)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const goods = await Goods.create({
      materialType,
      size,
      perKgRate,
      totalKg,
      date: date || new Date().toISOString().split("T")[0],
      createdBy: admin._id,
    });

    return new Response(
      JSON.stringify({ success: true, data: goods }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Goods Add Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();
    const goods = await Goods.find({}, "-createdBy"); // ❌ exclude createdBy

    return new Response(
      JSON.stringify({ success: true, data: goods }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Goods Fetch Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

