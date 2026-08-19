// app/api/rent/models/Rent.js
import mongoose from "mongoose";

const RentHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    from:   { type: String, required: true },
    reason: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const RentPaymentSchema = new mongoose.Schema(
  {
    forMonth: { type: String, required: true },
    amount:   { type: Number, required: true, min: 0 },
    paidOn:   { type: String, required: true },
    reason:   { type: String, default: "", trim: true },
    note:     { type: String, default: "", trim: true },
  }
);

const RentSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "main", unique: true },

    landlordName:    { type: String, default: "", trim: true },
    landlordPhone:   { type: String, default: "", trim: true },
    propertyAddress: { type: String, default: "", trim: true },

    dueDay: { type: Number, default: 5, min: 1, max: 28 },
    rentStartMonth: { type: String, default: null }, 

    monthlyRent:  { type: Number, default: 0, min: 0 },
    rentHistory:  [RentHistorySchema],
    payments:     [RentPaymentSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Rent || mongoose.model("Rent", RentSchema);