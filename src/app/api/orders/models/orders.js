// app/api/orders/models/orders.js
//
// ✅ FIX 1: lastPayment deprecated field HATA DIYA
//   Pehle: lastPayment alag field tha sirf backward compat ke liye
//   Problem: paymentHistory array pehle se hai — lastPayment redundant tha
//            Storage waste + confusion — dono mein different data ho sakta tha
//   Ab: lastPayment nahi hai — sirf paymentHistory use karo
//       Frontend ko bhi update karna hoga agar lastPayment use karta ho
//
// ✅ FIX 2: customer: Object → proper schema
//   Pehle: customer: { name: String, phone: String, address: String }
//   Problem: koi validation nahi — koi bhi data store ho sakta tha
//   Ab: required fields, trim, type validation sab hai

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

// ✅ FIX 2: customer ke liye proper schema
// Pehle: customer: { name: String, phone: String, address: String }
// Problem: required nahi tha — empty customer save ho sakta tha
// Ab: name aur phone required hain, trim bhi hai
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
    // ✅ FIX 2: Object → CustomerSchema — validation ab hogi
    customer: { type: CustomerSchema, required: true },

    orders: { type: [SingleOrderSchema], default: [] },

    // ✅ FIX: Array mein rakho — overwrite nahi hogi history
    paymentHistory: { type: [PaymentEntrySchema], default: [] },

    // ✅ FIX 1: lastPayment HATA DIYA
    // Pehle:
    //   lastPayment: {
    //     completedDate:  String,
    //     entries:        Array,
    //     totalAmount:    Number,
    //     receivedAmount: Number,
    //     dueAmount:      Number,
    //   }
    // Problem: paymentHistory already sab kuch track karta hai
    //          lastPayment redundant tha aur confusing bhi
    //          Dono mein alag alag data ho sakta tha — data inconsistency
    // Ab: Agar last payment chahiye to:
    //   paymentHistory.at(-1) use karo — hamesha correct aur updated

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.Orders || mongoose.model("Orders", OrdersSchema);