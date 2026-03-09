// app/api/goods/model.js
import mongoose from "mongoose";

const GoodsSchema = new mongoose.Schema(
  {
    materialType: {
      type: String,
      enum: ["MS", "GI", "Others"],
      required: true,
    },
    size: { type: String, required: true },
    perKgRate: { type: Number, required: true },
    totalKg: { type: Number, required: true },
    totalAmount: { type: Number },
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split("T")[0], // auto set today's date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-calculate totalAmount if not provided
GoodsSchema.pre("save", function (next) {
  if (!this.totalAmount) {
    this.totalAmount = this.perKgRate * this.totalKg;
  }
  next();
});

export default mongoose.models.Goods || mongoose.model("Goods", GoodsSchema);
