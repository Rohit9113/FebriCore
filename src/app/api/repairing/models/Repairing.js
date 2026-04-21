// app/api/repairing/models/Repairing.js
//
// ✅ FIX 1: date field required nahi tha
//   Pehle: date field optional tha — missing ho sakti thi
//   Problem: Income/profit API date ke basis pe filter karti hai
//            Agar date missing ho toh repairing entry income mein count nahi hogi
//   Ab: default value set ki — route se nahi ayi toh model khud today set karega
//
// ✅ FIX 2: amount validation
//   Pehle: koi min check nahi tha — 0 ya negative amount save ho sakta tha
//   Ab: min: 1 — zero ya negative allowed nahi

import mongoose from "mongoose";

const RepairingSchema = new mongoose.Schema(
  {
    amount: {
      type:     Number,
      required: true,
      min:      [1, "Amount zero ya negative nahi ho sakta"], // ✅ FIX 2
    },
    description: {
      type:    String,
      default: "",
      trim:    true,
    },
    // ✅ FIX 1: Date required + proper default
    // Pehle: date optional tha — missing ho sakti thi
    // Ab: default se aaj ki date set hoti hai agar nahi di
    date: {
      type:    String, // YYYY-MM-DD format
      default: () => new Date().toISOString().split("T")[0], // ✅ FIX: auto today
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Admin",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Repairing ||
  mongoose.model("Repairing", RepairingSchema);