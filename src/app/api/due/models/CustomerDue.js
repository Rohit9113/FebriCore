// app/api/due/models/CustomerDue.js
import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true }, // e.g. "Grill", "Gate"
    qty:      { type: Number, required: true, min: 0 },     // e.g. 5
    unit:     { type: String, default: "pcs", trim: true }, // pcs, kg, ft, etc.
    price:    { type: Number, required: true, min: 0 },     // price per unit
    total:    { type: Number, required: true, min: 0 },     // qty * price
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
    description: { type: String, default: "", trim: true }, // extra notes

    // ── Work / Items ──────────────────────────────────────────────
    items: [ItemSchema], // [ { name, qty, unit, price, total } ]

    // ── Financials ────────────────────────────────────────────────
    totalAmount:  { type: Number, required: true, min: 0, default: 0 },
    paidAmount:   { type: Number, default: 0, min: 0 },
    dueAmount:    { type: Number, default: 0, min: 0 },

    // ── Payment History ───────────────────────────────────────────
    payments: [PaymentSchema],

    // ── Status ────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["due", "partial", "paid"],
      default: "due",
    },

    // ── Work Date ─────────────────────────────────────────────────
    workDate: {
      type:    String,
      default: () => new Date().toISOString().split("T")[0],
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

// Auto-calculate dueAmount + status before save
CustomerDueSchema.pre("save", function (next) {
  this.dueAmount  = Math.max(0, this.totalAmount - this.paidAmount);
  if      (this.paidAmount <= 0)                   this.status = "due";
  else if (this.paidAmount >= this.totalAmount)    this.status = "paid";
  else                                              this.status = "partial";
  next();
});

export default mongoose.models.CustomerDue ||
  mongoose.model("CustomerDue", CustomerDueSchema);