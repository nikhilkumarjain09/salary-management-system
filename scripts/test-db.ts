import { prisma } from "../lib/prisma";

async function main() {
  try {
    const usersCount = await prisma.user.count();
    const employeesCount = await prisma.employee.count();
    const salariesCount = await prisma.salaryRecord.count();
    const bandsCount = await prisma.compensationBand.count();
    const benchmarksCount = await prisma.marketBenchmark.count();
    const logsCount = await prisma.auditLogEntry.count();

    console.log("-----------------------------------------");
    console.log("DATABASE VERIFICATION STATISTICS:");
    console.log("-----------------------------------------");
    console.log(`Users:             ${usersCount}`);
    console.log(`Employees:         ${employeesCount}`);
    console.log(`Salary Records:    ${salariesCount}`);
    console.log(`Compensation Bands:${bandsCount}`);
    console.log(`Market Benchmarks: ${benchmarksCount}`);
    console.log(`Audit Log Entries: ${logsCount}`);
    console.log("-----------------------------------------");

    if (employeesCount === 10000) {
      console.log("SUCCESS: Database populated with exactly 10,000 employees!");
    } else {
      console.log(`WARNING: Expected 10000 employees, found ${employeesCount}`);
    }
  } catch (error) {
    console.error("FAILURE: Database validation failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
