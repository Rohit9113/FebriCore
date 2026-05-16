// app/api/admin/controllers.js
import Admin from "./model";
import { connectDB } from "@/lib/db";
import bcrypt from "bcryptjs";

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export const registerAdmin = async ({ name, phone, email, password }) => {
  await connectDB();

  const existingAdmin = await Admin.findOne({ role: "SuperAdmin" });
  if (existingAdmin) {
    throw new Error("SuperAdmin already exists!");
  }

  // Password validation
  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must contain at least 1 uppercase, 1 lowercase, 2 numbers, 1 special character, and minimum 8 characters."
    );
  }
  const existingPhone = await Admin.findOne({ phone: String(phone).trim() });
  if (existingPhone) {
    throw new Error("Is phone number se admin pehle se registered hai");
  }

  // Hash password
  const salt           = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = await Admin.create({
    name,
    phone:    String(phone).trim(),
    email:    String(email).trim().toLowerCase(),
    password: hashedPassword,
    role:     "SuperAdmin",
  });

  return {
    _id:   admin._id,
    name:  admin.name,
    email: admin.email,
    phone: admin.phone,
    role:  admin.role,
  };
};