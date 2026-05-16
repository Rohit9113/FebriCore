// app/api/orders/models/CompletedOrder.js
import mongoose from "mongoose";

const MaterialUsageSchema = new mongoose.Schema(
  {
    metalType:    { type: String },
    kgUsed:       { type: Number, default: 0 },
    purchaseRate: { type: Number, default: 0 },
    materialCost: { type: Number, default: 0 },
  },
  { _id: false }
);

const EntrySchema = new mongoose.Schema(
  {
    label:        { type: String },
    weight:       { type: Number, default: 0 },
    ratePerKg:    { type: Number, default: 0 },
    amount:       { type: Number, default: 0 },
    extraCharges: { type: Array,  default: [] },
    metalType:    { type: String },
    purchaseRate: { type: Number, default: 0 },
    materialCost: { type: Number, default: 0 },
  },
  { _id: false }
);
const PaymentEntrySchema = new mongoose.Schema(
  {
    completedDate:        { type: String },
    entries:              { type: [EntrySchema], default: [] },
    totalAmount:          { type: Number, default: 0 },
    finalAmount:          { type: Number, default: 0 },
    receivedAmount:       { type: Number, default: 0 },
    dueAmount:            { type: Number, default: 0 },
    materialUsage:        { type: [MaterialUsageSchema], default: [] },
    totalMaterialCost:    { type: Number, default: 0 },
    grossProfit:          { type: Number, default: 0 },
    previouslyReceived:   { type: Number, default: 0 },
    totalReceivedTillNow: { type: Number, default: 0 },
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
      totalAmount:    { type: Number, default: 0 },
      finalAmount:    { type: Number, default: 0 },
      receivedAmount: { type: Number, default: 0 },
      dueAmount:      { type: Number, default: 0 },

      // ── Material cost tracking ────────────────────────────────
      materialUsage:        { type: [MaterialUsageSchema], default: [] },
      totalMaterialCost:    { type: Number, default: 0 },
      grossProfit:          { type: Number, default: 0 },

      // ── Partial payment tracking ──────────────────────────────
      previouslyReceived:   { type: Number, default: 0 },
      totalReceivedTillNow: { type: Number, default: 0 },
      paymentHistory: { type: [PaymentEntrySchema], default: [] },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CompletedOrder ||
  mongoose.model("CompletedOrder", CompletedOrderSchema);