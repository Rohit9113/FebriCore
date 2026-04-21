// app/api/admin/controllers.js
//
// ✅ FIX: loginAdmin function HATA DIYA — dead code tha
//
// Pehle:
//   - loginAdmin() yahan defined tha
//   - /api/admin/login/route.js mein SAME logic dobara likha tha
//   - Dono alag alag maintain hote the — future mein sync se bahar jaate
//   - loginAdmin() kabhi call nahi hota tha — pure dead code
//
// Ab:
//   - Sirf registerAdmin() rakha — jo actually use hota hai
//   - Login logic sirf /api/admin/login/route.js mein hai
//   - Ek jagah update karo — dono sync rahenge automatically

import Admin from "./model";
import { connectDB } from "@/lib/db";
import bcrypt from "bcryptjs";

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export const registerAdmin = async ({ name, phone, email, password }) => {
  await connectDB();

  // ✅ Sirf ek SuperAdmin allowed hai
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

  // ✅ Phone duplicate check bhi karo
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

// ✅ loginAdmin HATA DIYA — login logic /api/admin/login/route.js mein hai
// Wahan se import nahi hota tha — pure dead code tha
// Agar future mein shared logic chahiye to tab add karna