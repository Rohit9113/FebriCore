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
    phone:         { type: String, required: true, trim: true },
    address:       { type: String, default: "" },
    joiningDate:   { type: String, required: true },
    isActive:      { type: Boolean, default: true },
    deactivatedOn: { type: String, default: null },

    perDaySalary:  { type: Number, required: true },
    salaryHistory: { type: [SalaryHistorySchema], default: [] },

    // ── Login credentials ──────────────────────────────────────
    // Auto-generated on employee creation:
    //   password = name first 3 letters (uppercase) + phone last 4 digits
    //   e.g. name="Ramesh Kumar", phone="9876543210" → "RAM3210"
    //
    // select: false → never returned in normal queries
    password:      { type: String, select: false },
    plainPassword: { type: String, select: false }, // admin ko dikhane ke liye

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