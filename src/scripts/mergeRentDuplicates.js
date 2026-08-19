// scripts/mergeRentDuplicates.js
import mongoose from "mongoose";
import Rent from "../app/api/rent/models/Rent.js";

const MONGO_URI = process.env.MONGODB_URI;

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const allRentDocs = await Rent.find({}).sort({ createdAt: 1 });
  console.log(`Found ${allRentDocs.length} Rent document(s)`);

  if (allRentDocs.length <= 1) {
    console.log("✅ Koi duplicate nahi hai — kuch karne ki zaroorat nahi.");
    await mongoose.disconnect();
    return;
  }

  const primary = allRentDocs[0];
  const duplicates = allRentDocs.slice(1);

  let mergedPayments = 0;
  let mergedHistory   = 0;

  for (const dup of duplicates) {
    for (const p of dup.payments || []) {
      primary.payments.push({
        forMonth: p.forMonth,
        amount:   p.amount,
        paidOn:   p.paidOn,
        reason:   p.reason,
        note:     p.note,
      });
      mergedPayments++;
    }

    for (const h of dup.rentHistory || []) {
      const exists = primary.rentHistory.some((ph) => ph.from === h.from);
      if (!exists) {
        primary.rentHistory.push({ amount: h.amount, from: h.from, reason: h.reason });
        mergedHistory++;
      }
    }

    if (!primary.landlordName    && dup.landlordName)    primary.landlordName    = dup.landlordName;
    if (!primary.landlordPhone   && dup.landlordPhone)   primary.landlordPhone   = dup.landlordPhone;
    if (!primary.propertyAddress && dup.propertyAddress) primary.propertyAddress = dup.propertyAddress;
    if (!primary.monthlyRent && dup.monthlyRent) primary.monthlyRent = dup.monthlyRent;
  }

  primary.rentHistory.sort((a, b) => new Date(a.from) - new Date(b.from));
  primary.singleton = "main";
  primary.markModified("payments");
  primary.markModified("rentHistory");
  await primary.save();

  const dupIds = duplicates.map((d) => d._id);
  await Rent.deleteMany({ _id: { $in: dupIds } });

  console.log(`\n✅ Migration complete!`);
  console.log(`   Primary document: ${primary._id}`);
  console.log(`   Merged payments:  ${mergedPayments}`);
  console.log(`   Merged history entries: ${mergedHistory}`);
  console.log(`   Deleted duplicate documents: ${dupIds.length}`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});