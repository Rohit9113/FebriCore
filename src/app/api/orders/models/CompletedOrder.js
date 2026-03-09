import mongoose from "mongoose";

const CompletedOrderSchema = new mongoose.Schema(
  {
    customer: {
      type: Object,
      required: true,
    },
    orders: {
      type: Array,
      required: true,
    },
    paymentReceive: {
      completedDate:  { type: String  },
      entries:        { type: Array   },   // weight/rate breakdown per item

      // ── Amount fields ──────────────────────────────────────────
      // totalAmount    = full sale value (received + due)
      // finalAmount    = jo actually mila (= receivedAmount)
      // receivedAmount = same as finalAmount (compatibility)
      // dueAmount      = abhi baaki hai (0 = fully paid)
      totalAmount:    { type: Number, default: 0 },
      finalAmount:    { type: Number, default: 0 },   // ← income API yahi use karta hai
      receivedAmount: { type: Number, default: 0 },
      dueAmount:      { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CompletedOrder ||
  mongoose.model("CompletedOrder", CompletedOrderSchema);