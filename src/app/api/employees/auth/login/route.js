// app/api/employees/auth/login/route.js
// ✅ Rate limiting added — brute force protection

import { connectDB }          from "@/lib/db";
import Employee               from "@/app/api/employees/models/Employee";
import bcrypt                 from "bcryptjs";
import jwt                    from "jsonwebtoken";
import { employeeLoginLimiter } from "@/app/api/middleware/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET;

const handler = async (req) => {
  try {
    await connectDB();

    const { phone, password } = await req.json();

    if (!phone || !password) {
      return Response.json(
        { success: false, error: "Phone aur password required hain" },
        { status: 400 }
      );
    }

    const employee = await Employee.findOne({ phone }).select("+password");

    if (!employee) {
      return Response.json(
        { success: false, error: "Phone ya password galat hai" },
        { status: 401 }
      );
    }

    if (!employee.isActive) {
      return Response.json(
        { success: false, error: "Account deactivate hai — admin se baat karo" },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return Response.json(
        { success: false, error: "Phone ya password galat hai" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        _id:   employee._id,
        empId: employee.empId,
        name:  employee.name,
        phone: employee.phone,
        role:  "employee",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return Response.json({
      success: true,
      token,
      employee: {
        _id:   employee._id,
        empId: employee.empId,
        name:  employee.name,
        phone: employee.phone,
      },
    }, { status: 200 });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
};

// ✅ Rate limiter wrap karo
export const POST = employeeLoginLimiter(handler);