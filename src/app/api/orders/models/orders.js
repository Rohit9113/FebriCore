//app/api/orders/models/orders.js
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

const OrdersSchema = new mongoose.Schema(
  {
    customer: {
      name:    String,
      phone:   String,
      address: String,
    },
    orders: [SingleOrderSchema],
    // Partial payment details stored here
    lastPayment: {
      completedDate: String,
      entries:       Array,
      totalAmount:   Number,
      receivedAmount: Number,
      dueAmount:     Number,
    },
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

export default mongoose.models.Orders || mongoose.model("Orders", OrdersSchema);