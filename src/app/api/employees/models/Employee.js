// app/api/employees/models/Employee.js
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
    overtimeHours: {
      type:    Number,
      default: 0,
      min:     0,
      max:     12,
    },
    overtimeAmount: {
      type:    Number,
      default: 0,
      min:     0,
    },
  },
  { _id: false }
);

const SalaryHistorySchema = new mongoose.Schema(
  {
    salary: { type: Number, required: true },
    from:   { type: String, required: true },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const SalaryPaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    paidOn: { type: String, required: true },
    note:   { type: String, default: "" },
    dates:  [String],
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