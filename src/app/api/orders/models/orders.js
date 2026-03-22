// app/api/orders/models/orders.js
// ✅ FIX: paymentHistory — array instead of single lastPayment
//         Taaki partial payment history kabhi overwrite na ho

import mongoose from "mongoose";

const SingleOrderSchema = new mongoose.Schema(
  {
    orderId:     Number,
    orderType:   String,
    date:        String,
    itemType:    String,
    metalType:   String,
    height:      Number,
    width:       Number,
    perKgRate:   Number,
    extraCharge: Number,
    amount:      Number,
    description: String,
    status:      { type: String, default: "Pending" },
  },
  { _id: false }
);

// ✅ NEW: Payment entry schema (partial payments ke liye)
const PaymentEntrySchema = new mongoose.Schema(
  {
    completedDate:     String,
    entries:           Array,
    totalAmount:       { type: Number, default: 0 },
    finalAmount:       { type: Number, default: 0 },
    receivedAmount:    { type: Number, default: 0 },
    dueAmount:         { type: Number, default: 0 },
    materialUsage:     { type: Array, default: [] },
    totalMaterialCost: { type: Number, default: 0 },
    grossProfit:       { type: Number, default: 0 },
  },
  { _id: false }
);

const OrdersSchema = new mongoose.Schema(
  {
    customer: {
      name:    String,
      phone:   String,
      address: String,
    },
    orders: [SingleOrderSchema],

    // ✅ FIX: Array mein rakho — overwrite nahi hogi history
    paymentHistory: { type: [PaymentEntrySchema], default: [] },

    // Backward compatibility ke liye rakha — last payment reference
    lastPayment: {
      completedDate:  String,
      entries:        Array,
      totalAmount:    Number,
      receivedAmount: Number,
      dueAmount:      Number,
    },

    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

export default mongoose.models.Orders || mongoose.model("Orders", OrdersSchema);