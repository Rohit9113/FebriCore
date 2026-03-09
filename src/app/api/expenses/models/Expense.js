//app/api/expenses/models/Expense.js
import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["goods"],
      default: "goods",
    },
    category: {
      type: String,
      enum: ["Material", "Hardware", "Fuel", "Designs", "Other"],
      required: true,
    },
    desc: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
      default: 1,
    },
    unit: {
      type: String,
      default: "pcs",
    },
    rate: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Expense ||
  mongoose.model("Expense", ExpenseSchema);