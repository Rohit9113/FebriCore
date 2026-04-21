// app/api/employees/models/Employee.js
//
// ✅ FIX: plainPassword field DB se hata diya
// Plain text password kabhi bhi DB mein save nahi hona chahiye
// Admin ko password sirf ek baar response mein dikhao — store mat karo

import mongoose from "mongoose";

const SalaryHistorySchema = new mongoose.Schema(
  {
    salary: { type: Number, required: true },
    from:   { type: String, required: true },
    reason: { type: String, default: "Salary Update" },
  },
  { _id: false }
);

const AttendanceEntrySchema = new mongoose.Schema(
  {
    status:   { type: String, enum: ["present", "absent", "auto-present"], required: true },
    markedBy: { type: String, enum: ["manual", "auto"], default: "manual" },
  },
  { _id: false }
);

const SalaryPaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    paidOn: { type: String, required: true },
    note:   { type: String, default: "" },
    dates:  [{ type: String }],
  },
  { _id: false }
);

const EmployeeSchema = new mongoose.Schema(
  {
    empId:         { type: String, required: true, unique: true },
    name:          { type: String, required: true, trim: true },

    // ✅ FIX: phone pe unique index add kiya DB level pe
    // Pehle sirf route level pe check tha — race condition possible tha
    phone:         { type: String, required: true, trim: true, unique: true },

    address:       { type: String, default: "" },
    joiningDate:   { type: String, required: true },
    isActive:      { type: Boolean, default: true },
    deactivatedOn: { type: String, default: null },

    perDaySalary:  { type: Number, required: true },
    salaryHistory: { type: [SalaryHistorySchema], default: [] },

    // ── Login credentials ──────────────────────────────────────
    // Auto-generated: name first 3 (uppercase) + phone last 4 digits
    // e.g. "Ramesh Kumar" + "9876543210" → "RAM3210"
    // select: false → normal queries mein kabhi nahi aata
    password: { type: String, select: false },

    // ✅ FIX: plainPassword field HATA DIYA
    // Pehle: plainPassword: { type: String, select: false }
    // Yeh plain text password DB mein store karta tha — BAHUT BADI security hole
    // Ab password sirf employee create karte waqt ek baar response mein
    // dikhaya jaata hai — DB mein kabhi save nahi hoga

    // ── Work data ──────────────────────────────────────────────
    attendance:     { type: Map, of: AttendanceEntrySchema, default: {} },
    paidDates:      { type: [String], default: [] },
    salaryPayments: { type: [SalaryPaymentSchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.Employee ||
  mongoose.model("Employee", EmployeeSchema);