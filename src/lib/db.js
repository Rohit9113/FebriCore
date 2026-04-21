// src/lib/db.js
//
// ✅ FIX 30: console.log hata diya — production mein nahi chahiye
//   console.error rakha — server-side only hai, browser tak nahi jaata
//   Mongoose connection success silently hota hai ab

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error("❌ Please add your MONGODB_URI to .env.local");
}

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    const db = await mongoose.connect(MONGO_URI);
    isConnected = db.connections[0].readyState;
    // ✅ FIX 30: console.log hata diya
    // Success silently hota hai — logs mein noise nahi
  } catch (error) {
    // ✅ Server-side console.error rakha — Vercel/Railway logs mein jaata hai
    // Browser tak kabhi nahi pahuncha — security issue nahi
    console.error("❌ MongoDB connection failed:", error);
    throw new Error("Database connection error");
  }
};