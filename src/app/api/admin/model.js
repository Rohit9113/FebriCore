// app/api/admin/model.js
//
// ✅ FIX 1: phone pe unique index add kiya
//   Pehle: phone field unique nahi tha — duplicate phone save ho sakta tha
//   Ab: unique: true — DB level pe guarantee
//
// ✅ FIX 2: email lowercase + trim
//   Pehle: email as-is save hota tha — "Admin@Email.com" aur "admin@email.com" alag the
//   Ab: lowercase aur trim — consistent storage
//
// ✅ FIX 3: role enum — sirf valid roles allowed
//   Pehle: role: { type: String, default: "SuperAdmin" } — koi bhi role set ho sakta tha
//   Ab: enum mein sirf allowed roles hain

import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    // ✅ FIX 1: unique index — duplicate phone nahi ho sakta
    phone: {
      type:     String,
      required: true,
      unique:   true,  // ✅ DB level guarantee
      trim:     true,
    },
    // ✅ FIX 2: lowercase + trim — consistent storage
    email: {
      type:      String,
      required:  true,
      unique:    true,
      trim:      true,
      lowercase: true, // ✅ "Admin@Email.com" → "admin@email.com"
    },
    password: {
      type:     String,
      required: true,
      select:   false, // ✅ Normal queries mein nahi aayega
    },
    // ✅ FIX 3: enum — sirf valid roles
    role: {
      type:    String,
      enum:    ["SuperAdmin"], // ✅ Future mein aur roles add kar sakte ho
      default: "SuperAdmin",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model("Admin", AdminSchema);