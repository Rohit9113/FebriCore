import { connectDB }  from "@/lib/db";
import Employee       from "./models/Employee";
import { verifyAdmin } from "@/app/api/middleware/auth";
import bcrypt         from "bcryptjs";

// ─── Helpers ─────────────────────────────────────────────────────

const generateEmpId = (name, phone, count) => {
  const namePart  = name.trim().replace(/\s+/g, "").substring(0, 3).toUpperCase();
  const phonePart = String(phone).replace(/\D/g, "").slice(-4);
  const seq       = String(count + 1).padStart(3, "0");
  return `${namePart}-${phonePart}-${seq}`;
};

// Password: name first 3 (uppercase) + phone last 4 digits
// e.g. "Ramesh Kumar" + "9876543210" → "RAM3210"
const generatePassword = (name, phone) => {
  const namePart  = name.trim().replace(/\s+/g, "").substring(0, 3).toUpperCase();
  const phonePart = String(phone).replace(/\D/g, "").slice(-4);
  return `${namePart}${phonePart}`;
};

// ─────────────────────────────────────────────────────────────────
// POST  /api/employees  —  Naya employee register karo
// Body: { name, phone, address?, joiningDate?, perDaySalary }
// ─────────────────────────────────────────────────────────────────
export const POST = verifyAdmin(async (req) => {
  try {
    await connectDB();

    const body = await req.json();
    const { name, phone, address, joiningDate, perDaySalary } = body;

    // Validation
    if (!name || !phone || !perDaySalary) {
      return Response.json(
        { success: false, error: "name, phone aur perDaySalary required hain" },
        { status: 400 }
      );
    }

    // Duplicate phone check
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

    // Password generate + hash
    const plainPassword  = generatePassword(name, phone);
    const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt(10));

    const employee = await Employee.create({
      empId,
      name:        name.trim(),
      phone:       String(phone).trim(),
      address:     address || "",
      joiningDate: joinDate,
      isActive:    true,
      deactivatedOn: null,
      perDaySalary:  Number(perDaySalary),
      salaryHistory: [
        { salary: Number(perDaySalary), from: joinDate, reason: "Joining Salary" },
      ],
      password:      hashedPassword,
      plainPassword: plainPassword,
      attendance:    {},
      paidDates:     [],
      salaryPayments: [],
      createdBy: req.admin._id,
    });

    return Response.json({
      success: true,
      message: "Employee register ho gaya",
      data: {
        _id:          employee._id,
        empId:        employee.empId,
        name:         employee.name,
        phone:        employee.phone,
        address:      employee.address,
        joiningDate:  employee.joiningDate,
        perDaySalary: employee.perDaySalary,
        isActive:     employee.isActive,
        // Admin ko ek baar dikhao — share karo employee se
        loginPassword: plainPassword,
        passwordNote:  `Login: phone = ${phone}, password = ${plainPassword}`,
      },
    }, { status: 201 });

  } catch (err) {
    console.error("Employee POST error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});

// ─────────────────────────────────────────────────────────────────
// GET  /api/employees  —  Sab employees list
// Query: ?status=active | inactive
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
      const attObj = emp.attendance instanceof Map
        ? Object.fromEntries(emp.attendance)
        : Object.fromEntries(Object.entries(emp.attendance || {}));

      const entries      = Object.values(attObj);
      const presentCount = entries.filter(
        (v) => v.status === "present" || v.status === "auto-present"
      ).length;
      const absentCount  = entries.filter((v) => v.status === "absent").length;
      const totalPaid    = (emp.salaryPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
      const totalEarned  = presentCount * emp.perDaySalary;
      const dueAmount    = Math.max(0, totalEarned - totalPaid);

      return {
        ...emp.toObject(),
        attendance: attObj,
        stats: {
          present:    presentCount,
          absent:     absentCount,
          totalEarned,
          paidAmount: totalPaid,
          dueAmount,
        },
      };
    });

    return Response.json(
      { success: true, count: data.length, data },
      { status: 200 }
    );

  } catch (err) {
    console.error("Employee GET error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
});