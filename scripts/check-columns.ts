import { prisma } from "../lib/prisma";

async function main() {
  try {
    const cols = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'SalaryRecord'
    `;
    console.log("SalaryRecord columns in database:", cols);
  } catch (err) {
    console.error("Failed to query information_schema:", err);
  }
}

main();
