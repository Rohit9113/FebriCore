// app/api/goods/model.js
// ✅ FIX: "Others" → "Other" (frontend se match)
// ✅ FIX: totalAmount auto-recalculate on any modification

import mongoose from "mongoose";

const GoodsSchema = new mongoose.Schema(
  {
    materialType: {
      type: String,
      enum: ["MS", "GI", "Other"], // ✅ FIXED: "Others" → "Other"
      required: true,
    },
    size:        { type: String, required: true },
    perKgRate:   { type: Number, required: true },
    totalKg:     { type: Number, required: true },
    totalAmount: { type: Number },
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split("T")[0],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ FIX: isModified check — 0 value pe bhi recalculate karo
GoodsSchema.pre("save", function (next) {
  if (
    !this.totalAmount ||
    this.isModified("perKgRate") ||
    this.isModified("totalKg")
  ) {
    this.totalAmount = this.perKgRate * this.totalKg;
  }
  next();
});

export default mongoose.models.Goods || mongoose.model("Goods", GoodsSchema);