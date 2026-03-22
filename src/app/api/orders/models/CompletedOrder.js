// app/api/orders/models/CompletedOrder.js
// ✅ NEW: materialUsage — order complete karte waqt kitna iron use hua track karo
// ✅ NEW: totalMaterialCost — actual purchase rate se cost
// ✅ NEW: grossProfit — saleAmount - materialCost
// ✅ FIX: createdBy mein ref: "Admin" add kiya

import mongoose from "mongoose";

// ── Material usage per entry ──────────────────────────────────────
// Har entry ke saath kitna aur kaun sa metal use hua
const MaterialUsageSchema = new mongoose.Schema(
  {
    metalType:    { type: String }, // "MS", "GI", "Other"
    kgUsed:       { type: Number, default: 0 }, // kitna kg use hua
    purchaseRate: { type: Number, default: 0 }, // stock se khareedne ka rate
    materialCost: { type: Number, default: 0 }, // kgUsed × purchaseRate
  },
  { _id: false }
);

// ── Per-entry payment breakdown ───────────────────────────────────
const EntrySchema = new mongoose.Schema(
  {
    label:        { type: String },
    weight:       { type: Number, default: 0 },
    ratePerKg:    { type: Number, default: 0 }, // SALE rate (customer ko charge)
    amount:       { type: Number, default: 0 }, // weight × saleRate
    extraCharges: { type: Array,  default: [] },
    // ✅ NEW: is entry ka material cost
    metalType:    { type: String },
    purchaseRate: { type: Number, default: 0 }, // stock purchase rate
    materialCost: { type: Number, default: 0 }, // weight × purchaseRate
  },
  { _id: false }
);

const CompletedOrderSchema = new mongoose.Schema(
  {
    customer: { type: Object, required: true },
    orders:   { type: Array,  required: true },

    paymentReceive: {
      completedDate:  { type: String },
      entries:        { type: [EntrySchema], default: [] },

      // ── Sale amounts ──────────────────────────────────────────
      totalAmount:    { type: Number, default: 0 }, // full sale value
      finalAmount:    { type: Number, default: 0 }, // jo mila (= receivedAmount)
      receivedAmount: { type: Number, default: 0 }, // compatibility
      dueAmount:      { type: Number, default: 0 }, // abhi baaki

      // ✅ NEW: Material cost tracking
      // ─────────────────────────────────────────────────────────
      // Agar Normal Order hai (weight-based) to material cost track hoga
      // Contract/Repairing mein material usage optional hai
      materialUsage:     { type: [MaterialUsageSchema], default: [] },
      totalMaterialCost: { type: Number, default: 0 }, // sum of all materialUsage costs
      grossProfit:       { type: Number, default: 0 }, // totalAmount - totalMaterialCost
      // ─────────────────────────────────────────────────────────
    },

    // ✅ FIX: ref add kiya
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CompletedOrder ||
  mongoose.model("CompletedOrder", CompletedOrderSchema);