import { connectDB } from "@/lib/db";
import Employee      from "@/app/api/employees/models/Employee";
import bcrypt        from "bcryptjs";
import jwt           from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectDB();

    const { phone, password } = await req.json();

    if (!phone || !password) {
      return Response.json(
        { success: false, error: "Phone aur password required hain" },
        { status: 400 }
      );
    }

    const emp = await Employee
      .findOne({ phone: String(phone).trim() })
      .select("+password");

    if (!emp) {
      return Response.json(
        { success: false, error: "Phone ya password galat hai" },
        { status: 401 }
      );
    }

    if (!emp.password) {
      return Response.json(
        { success: false, error: "Is employee ka password set nahi hai — admin se contact karo" },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, emp.password);
    if (!isMatch) {
      return Response.json(
        { success: false, error: "Phone ya password galat hai" },
        { status: 401 }
      );
    }

    if (!emp.isActive) {
      return Response.json(
        { success: false, error: "Account deactivate hai — admin se baat karo" },
        { status: 403 }
      );
    }

    const token = jwt.sign(
      {
        _id:   emp._id,
        empId: emp.empId,
        name:  emp.name,
        phone: emp.phone,
        role:  "employee",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return Response.json({
      success: true,
      data: {
        token,
        role: "employee",        // ← frontend check ke liye
        employee: {
          _id:          emp._id,
          empId:        emp.empId,
          name:         emp.name,
          phone:        emp.phone,
          role:         "employee",  // ← yahan bhi
          address:      emp.address,
          joiningDate:  emp.joiningDate,
          perDaySalary: emp.perDaySalary,
          isActive:     emp.isActive,
        },
      },
    }, { status: 200 });

  } catch (err) {
    console.error("Employee login error:", err);
    return Response.json(
      { success: false, error: "Kuch galat hua — dobara try karo" },
      { status: 500 }
    );
  }
}