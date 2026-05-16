// app/api/admin/model.js
import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
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
    email: {
      type:      String,
      required:  true,
      unique:    true,
      trim:      true,
      lowercase: true,
    },
    password: {
      type:     String,
      required: true,
      select:   false,
    },
    role: {
      type:    String,
      enum:    ["SuperAdmin"],
      default: "SuperAdmin",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model("Admin", AdminSchema);