// app/api/goods/model.js
import mongoose from "mongoose";

const GoodsSchema = new mongoose.Schema(
  {
    materialType: {
      type:     String,
      enum:     ["MS", "GI", "Other"],
      required: true,
    },
    size:      { type: String, required: true },
    perKgRate: {
      type:     Number,
      required: true,
      min:      [0.01, "perKgRate zero ya negative nahi ho sakta"],
    },
    totalKg: {
      type:     Number,
      required: true,
      min:      [0.001, "totalKg zero ya negative nahi ho sakta"],
    },
    totalAmount: { type: Number },
    date: {
      type:     String,
      required: true,
      default:  () => new Date().toISOString().split("T")[0],
    },
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Admin",
      required: true,
    },
  },
  { timestamps: true }
);
GoodsSchema.pre("save", function (next) {
  const shouldRecalculate =
    this.isNew ||
    this.isModified("perKgRate") ||
    this.isModified("totalKg");

  if (shouldRecalculate) {
    const rate = Number(this.perKgRate) || 0;
    const kg   = Number(this.totalKg)   || 0;
    this.totalAmount = parseFloat((rate * kg).toFixed(2));
  }

  next();
});

export default mongoose.models.Goods || mongoose.model("Goods", GoodsSchema);