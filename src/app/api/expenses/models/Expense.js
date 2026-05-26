//app/api/expenses/models/Expense.js
import mongoose from "mongoose";

// Clear cached model to avoid stale enum issues
if (mongoose.models.Expense) {
  delete mongoose.models.Expense;
}

const ExpenseSchema = new mongoose.Schema(
  {
    category: {
      type:     String,
      enum:     ["Hardware", "Diesel", "Petrol", "Transport", "Other"],
      required: true,
    },
    desc: {
      type:     String,
      required: true,
      trim:     true,
    },
    qty: {
      type:    Number,
      default: 1,
    },
    unit: {
      type:    String,
      default: "pcs",
    },
    rate: {
      type:    Number,
      default: 0,
    },
    amount: {
      type:     Number,
      required: true,
    },
    date: {
      type:     String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Admin",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", ExpenseSchema);