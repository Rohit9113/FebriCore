// app/api/goods/model.js
//
// ✅ FIX: Pre-save hook bug fixed
//
// Pehle ka bug:
//   if (!this.totalAmount || this.isModified("perKgRate") || this.isModified("totalKg"))
//
//   Problem 1: !this.totalAmount → agar totalAmount = 0 ho toh recalculate hoga
//              (0 falsy hota hai JavaScript mein)
//   Problem 2: Agar perKgRate = 0 ya totalKg = 0 bheja jaaye toh
//              totalAmount = 0 save ho jaata tha bina error ke
//   Problem 3: Condition short-circuit — agar totalAmount exist kare
//              but fields modify na ho toh recalculate nahi hota tha (theek hai)
//              but logic confusing tha
//
// Ab:
//   - isNew check — naya document pe hamesha calculate karo
//   - isModified check — sirf jab field change ho tab recalculate
//   - perKgRate aur totalKg dono > 0 validation
//   - Clear aur readable logic

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
      min:      [0.01, "perKgRate zero ya negative nahi ho sakta"], // ✅ FIX: validation
    },
    totalKg: {
      type:     Number,
      required: true,
      min:      [0.001, "totalKg zero ya negative nahi ho sakta"],  // ✅ FIX: validation
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

// ✅ FIX: Pre-save hook — clear aur correct logic
//
// Pehle: if (!this.totalAmount || this.isModified(...))
//   Bug: !this.totalAmount → 0 falsy hai, unnecessary recalculate
//
// Ab:
//   - Naya doc (this.isNew) → hamesha calculate karo
//   - Existing doc → sirf tab calculate karo jab rate ya kg change ho
GoodsSchema.pre("save", function (next) {
  const shouldRecalculate =
    this.isNew ||                         // ✅ Naya document
    this.isModified("perKgRate") ||       // ✅ Rate change hua
    this.isModified("totalKg");           // ✅ Kg change hua

  if (shouldRecalculate) {
    // ✅ FIX: Dono values valid honi chahiye — NaN se bacho
    const rate = Number(this.perKgRate) || 0;
    const kg   = Number(this.totalKg)   || 0;
    this.totalAmount = parseFloat((rate * kg).toFixed(2));
  }

  next();
});

export default mongoose.models.Goods || mongoose.model("Goods", GoodsSchema);