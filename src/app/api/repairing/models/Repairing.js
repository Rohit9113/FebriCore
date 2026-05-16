// app/api/repairing/models/Repairing.js
import mongoose from "mongoose";

const RepairingSchema = new mongoose.Schema(
  {
    amount: {
      type:     Number,
      required: true,
      min:      [1, "Amount zero ya negative nahi ho sakta"],
    },
    description: {
      type:    String,
      default: "",
      trim:    true,
    },
    date: {
      type:    String, // YYYY-MM-DD format
      default: () => new Date().toISOString().split("T")[0],
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