// app/api/orders/models/orders.js
import mongoose from "mongoose";

const SingleOrderSchema = new mongoose.Schema(
  {
    orderId:     { type: Number },
    orderType:   { type: String },
    date:        { type: String },
    itemType:    { type: String },
    metalType:   { type: String },
    height:      { type: Number },
    width:       { type: Number },
    perKgRate:   { type: Number },
    extraCharge: { type: Number },
    amount:      { type: Number },
    description: { type: String },
    status:      { type: String, default: "Pending" },
  },
  { _id: false }
);

const PaymentEntrySchema = new mongoose.Schema(
  {
    completedDate:     { type: String },
    entries:           { type: Array, default: [] },
    totalAmount:       { type: Number, default: 0 },
    finalAmount:       { type: Number, default: 0 },
    receivedAmount:    { type: Number, default: 0 },
    dueAmount:         { type: Number, default: 0 },
    materialUsage:     { type: Array,  default: [] },
    totalMaterialCost: { type: Number, default: 0 },
    grossProfit:       { type: Number, default: 0 },
  },
  { _id: false }
);
const CustomerSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true,  trim: true },
    phone:   { type: String, required: true,  trim: true },
    address: { type: String, default: "",     trim: true },
  },
  { _id: false }
);

const OrdersSchema = new mongoose.Schema(
  {
    customer: { type: CustomerSchema, required: true },

    orders: { type: [SingleOrderSchema], default: [] },

    paymentHistory: { type: [PaymentEntrySchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.Orders || mongoose.model("Orders", OrdersSchema);