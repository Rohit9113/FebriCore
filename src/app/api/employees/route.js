// app/api/employees/route.js

import { connectDB }   from "@/lib/db";
import Employee        from "./models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";
import bcrypt          from "bcryptjs";

// ─── Helpers ─────────────────────────────────────────────────────
const generateEmpId = (name, phone, count) => {
  const namePart  = name.trim().replace(/\s+/g, "").substring(0, 3).toUpperCase();
  const phonePart = String(phone).replace(/\D/g, "").slice(-4);
  const seq       = String(count + 1).padStart(3, "0");
  return `${namePart}-${phonePart}-${seq}`;
};

const generatePassword = (name, phone) => {
  const namePart  = name.trim().replace(/\s+/g, "").substring(0, 3).toUpperCase();
  const phonePart = String(phone).replace(/\D/g, "").slice(-4);
  return `${namePart}${phonePart}`;
};

// ✅ FIX: per-date salary helper
const getSalaryForDate = (date, salaryHistory, perDaySalary) => {
  if (!salaryHistory || salaryHistory.length === 0) return perDaySalary;
  const applicable = salaryHistory
    .filter((h) => h.from <= date)
    .sort((a, b) => new Date(b.from) - new Date(a.from));
  return applicable.length > 0 ? applicable[0].salary : perDaySalary;
};

// ✅ FIX: stats calculation — salary history aware
const calcStats = (emp) => {
  const attObj = emp.attendance instanceof Map
    ? Object.fromEntries(emp.attendance)
    : Object.fromEntries(Object.entries(emp.attendance || {}));

  const entries = Object.entries(attObj);

  const presentEntries = entries.filter(
    ([, v]) => v.status === "present" || v.status === "auto-present"
  );
  const absentCount = entries.filter(([, v]) => v.status === "absent").length;

  // ✅ Per-date salary — salary history aware
  const totalEarned = presentEntries.reduce(
    (sum, [date]) => sum + getSalaryForDate(date, emp.salaryHistory || [], emp.perDaySalary),
    0
  );

  const paidAmount = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const dueAmount  = Math.max(0, totalEarned - paidAmount);

  return {
    attObj,
    present:    presentEntries.length,
    absent:     absentCount,
    totalEarned: Math.round(totalEarned),
    paidAmount:  Math.round(paidAmount),
    dueAmount:   Math.round(dueAmount),
  };
};

// ─────────────────────────────────────────────────────────────────
// POST  /api/employees — Naya employee register
// ─────────────────────────────────────────────────────────────────
export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const body = await req.json();
    const { name, phone, address, joiningDate, perDaySalary } = body;

    if (!name || !phone || !perDaySalary) {
      return Response.json(
        { success: false, error: "name, phone aur perDaySalary required hain" },
        { status: 400 }
      );
    }

    const existing = await Employee.findOne({ phone: String(phone).trim() });
    if (existing) {
      return Response.json(
        { success: false, error: "Is phone number se employee pehle se registered hai" },
        { status: 409 }
      );
    }

    const today    = new Date().toISOString().split("T")[0];
    const count    = await Employee.countDocuments();
    const empId    = generateEmpId(name, phone, count);
    const joinDate = joiningDate || today;

    const plainPassword  = generatePassword(name, phone);
    const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt(10));

    const employee = await Employee.create({
      empId,
      name:          name.trim(),
      phone:         String(phone).trim(),
      address:       address || "",
      joiningDate:   joinDate,
      isActive:      true,
      deactivatedOn: null,
      perDaySalary:  Number(perDaySalary),
      // ✅ Joining salary bhi history mein add karo
      // Taaki getSalaryForDate joining date se sahi salary return kare
      salaryHistory: [
        { salary: Number(perDaySalary), from: joinDate, reason: "Joining Salary" },
      ],
      password:       hashedPassword,
      attendance:     {},
      paidDates:      [],
      salaryPayments: [],
      createdBy:      req.admin?._id || null,
    });

    return Response.json({
      success: true,
      message: "Employee register ho gaya",
      data: {
        _id:           employee._id,
        empId:         employee.empId,
        name:          employee.name,
        phone:         employee.phone,
        address:       employee.address,
        joiningDate:   employee.joiningDate,
        perDaySalary:  employee.perDaySalary,
        isActive:      employee.isActive,
        loginPassword: plainPassword,
        passwordNote:  "⚠️ Yeh password sirf ek baar dikh raha hai — abhi note kar lo! Phone: " + phone,
      },
    }, { status: 201 });

  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("Employee POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET  /api/employees — Sab employees list
// ─────────────────────────────────────────────────────────────────
export const GET = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query = {};
    if (status === "active")   query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    const data = employees.map((emp) => {
      const { attObj, present, absent, totalEarned, paidAmount, dueAmount } = calcStats(emp);
      return {
        ...emp.toObject(),
        attendance: attObj,
        stats: {
          present,
          absent,
          totalEarned,  // ✅ salary history aware
          paidAmount,
          dueAmount,
        },
      };
    });

    return Response.json(
      { success: true, count: data.length, data },
      { status: 200 }
    );

  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("Employee GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});