// scripts/migrateSalaryHistory.js
import mongoose from "mongoose";
import Employee from "../app/api/employees/models/Employee.js";

const MONGO_URI = process.env.MONGODB_URI;

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const employees = await Employee.find({});
  console.log(`Found ${employees.length} employees`);

  let fixed = 0;
  let skipped = 0;

  for (const emp of employees) {
    // Sirf fix karo agar salaryHistory empty hai
    if (emp.salaryHistory.length === 0 && emp.perDaySalary > 0) {
      emp.salaryHistory.push({
        salary: emp.perDaySalary,
        from:   emp.joiningDate,
        reason: "Initial Salary (migrated)",
      });
      emp.markModified("salaryHistory");
      await emp.save();
      fixed++;
      console.log(`  ✓ Fixed: ${emp.name} — ₹${emp.perDaySalary}/day from ${emp.joiningDate}`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Fixed:   ${fixed} employees`);
  console.log(`   Skipped: ${skipped} (already had history)`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});