// app/api/due/models/CustomerDue.js
import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    pieces: { type: Number, default: 1, min: 0 },
    pricingType: {
      type:    String,
      enum:    ["perKg", "contract"],
      default: "perKg",
    },

    // ── perKg fields ────────────────────────────────────────────
    weightKg:  { type: Number, default: 0, min: 0 },
    ratePerKg: { type: Number, default: 0, min: 0 },

    // ── contract field ──────────────────────────────────────────
    contractAmount: { type: Number, default: 0, min: 0 }, 

    // ── computed
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    amount:  { type: Number, required: true, min: 0 },
    paidOn:  { type: String, required: true }, // "YYYY-MM-DD"
    note:    { type: String, default: "", trim: true },
  },
  { _id: false }
);

const CustomerDueSchema = new mongoose.Schema(
  {
    // ── Customer Info ─────────────────────────────────────────────
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    address:     { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },

    items: [ItemSchema],

    totalAmount:  { type: Number, required: true, min: 0, default: 0 },
    paidAmount:   { type: Number, default: 0, min: 0 },
    dueAmount:    { type: Number, default: 0, min: 0 },

    // ── Payment History 
    payments: [PaymentSchema],

    // ── Status 
    status: {
      type:    String,
      enum:    ["due", "partial", "paid"],
      default: "due",
    },

    // ── Work Date 
    workDate: {
      type:    String,
      default: () => new Date().toISOString().split("T")[0],
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

CustomerDueSchema.pre("save", function (next) {
  this.dueAmount  = Math.max(0, this.totalAmount - this.paidAmount);
  if      (this.paidAmount <= 0)                   this.status = "due";
  else if (this.paidAmount >= this.totalAmount)    this.status = "paid";
  else                                              this.status = "partial";
  next();
});

export default mongoose.models.CustomerDue ||
  mongoose.model("CustomerDue", CustomerDueSchema);