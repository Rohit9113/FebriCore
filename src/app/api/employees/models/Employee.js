// app/api/employees/models/Employee.js
//
// ✅ UPDATE: attendance mein half-day aur overtime support add kiya
//
// Status types:
//   "present"      → 1.0 × perDaySalary
//   "absent"       → 0
//   "auto-present" → 1.0 × perDaySalary (auto-marked)
//   "half-day"     → 0.5 × perDaySalary  ✅ NEW
//   "overtime"     → perDaySalary + (overtimeHours × hourlyRate × 1.5) ✅ NEW
//
// overtimeHours: kitne extra ghante kaam kiya (sirf overtime status pe)

import mongoose from "mongoose";

const AttendanceEntrySchema = new mongoose.Schema(
  {
    status: {
      type:    String,
      enum:    ["present", "absent", "auto-present", "half-day", "overtime"],
      default: "absent",
    },
    markedBy: {
      type:    String,
      default: "manual",
    },
    // ✅ NEW: overtime ke liye extra hours
    overtimeHours: {
      type:    Number,
      default: 0,
      min:     0,
      max:     12, // max 12 extra hours reasonable hai
    },
  },
  { _id: false }
);

const SalaryHistorySchema = new mongoose.Schema(
  {
    salary:    { type: Number, required: true },
    from:      { type: String, required: true }, // "YYYY-MM-DD"
    reason:    { type: String, default: "" },
  },
  { _id: false }
);

const SalaryPaymentSchema = new mongoose.Schema(
  {
    amount:  { type: Number, required: true },
    paidOn:  { type: String, required: true }, // "YYYY-MM-DD"
    note:    { type: String, default: "" },
    dates:   [String],
  },
  { _id: false }
);

const EmployeeSchema = new mongoose.Schema(
  {
    empId: {
      type:   String,
      unique: true,
      trim:   true,
    },
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    phone: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    address: {
      type:    String,
      default: "",
      trim:    true,
    },
    joiningDate: {
      type:    String,
      default: () => new Date().toISOString().split("T")[0],
    },
    perDaySalary: {
      type:    Number,
      default: 0,
    },
    // ✅ NEW: overtime rate — agar custom rate set karna ho
    // Default: perDaySalary / 8 (8-hour shift based)
    // Agar 0 ho toh automatic calculate hoga
    overtimeRatePerHour: {
      type:    Number,
      default: 0,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    deactivatedOn: {
      type:    String,
      default: null,
    },
    // ✅ UPDATED: AttendanceEntrySchema use karo
    attendance: {
      type:    Map,
      of:      AttendanceEntrySchema,
      default: {},
    },
    salaryHistory:  [SalaryHistorySchema],
    salaryPayments: [SalaryPaymentSchema],
    paidDates:      [String],
    password: {
      type:   String,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Employee ||
  mongoose.model("Employee", EmployeeSchema);