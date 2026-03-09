//app/api/goods/summary/route.js
import { connectDB } from "@/lib/db";
import Goods from "@/app/api/goods/model";
import { verifyAdmin } from "@/app/api/middleware/auth";

export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    // Aggregate totalKg by materialType
    const summary = await Goods.aggregate([
      {
        $group: {
          _id: "$materialType",
          totalKg: { $sum: "$totalKg" },
        },
      },
    ]);

    // Initialize totals
    let totalMS = 0;
    let totalGI = 0;
    let totalOthers = 0;

    // Assign values based on aggregation result
    summary.forEach((item) => {
      if (item._id === "MS") totalMS = item.totalKg;
      else if (item._id === "GI") totalGI = item.totalKg;
      else if (item._id === "Others") totalOthers = item.totalKg;
    });

    const totalStock = totalMS + totalGI + totalOthers;

    const result = {
      totalMS,
      totalGI,
      totalOthers,
      totalStock,
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Goods Summary Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
