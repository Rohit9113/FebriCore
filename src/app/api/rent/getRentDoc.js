// app/api/rent/getRentDoc.js
import Rent from "./models/Rent";
export const getRentDoc = async () => {
  return Rent.findOneAndUpdate(
    { singleton: "main" },
    { $setOnInsert: { singleton: "main" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};