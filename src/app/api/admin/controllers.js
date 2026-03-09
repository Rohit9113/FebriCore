// app/api/admin/controller.js

import Admin from "./model";
import { connectDB } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d.*\d)(?=.*[!@#$%^&*]).{8,}$/;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not set in .env.local");
}

export const registerAdmin = async ({ name, phone, email, password }) => {
  await connectDB();

  // Check if SuperAdmin already exists
  const existingAdmin = await Admin.findOne({ role: "SuperAdmin" });
  if (existingAdmin) {
    throw new Error("SuperAdmin already exists!");
  }

  // Validate password
  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must contain at least 1 uppercase, 1 lowercase, 2 numbers, 1 special character, and minimum 8 characters."
    );
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create new admin
  const admin = await Admin.create({
    name,
    phone,
    email,
    password: hashedPassword,
    role: "SuperAdmin",
  });

  return {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
  };
};



export const loginAdmin = async ({ phone, password }) => {
  await connectDB();

  // Find admin by phone
  const admin = await Admin.findOne({ phone });
  if (!admin) {
    throw new Error("Admin not found");
  }

  // Check password
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new Error("Invalid password");
  }

  // Generate JWT token
  const token = jwt.sign(
    { _id: admin._id, name: admin.name, role: admin.role, phone: admin.phone },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, admin: { _id: admin._id, name: admin.name, phone: admin.phone, role: admin.role } };
};