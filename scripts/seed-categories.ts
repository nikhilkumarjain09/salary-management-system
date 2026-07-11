import { prisma } from "../lib/prisma";

const DEFAULT_CATEGORIES = [
  "Offer Letter",
  "Employment Contract",
  "Resume",
  "Government ID",
  "Passport",
  "Visa",
  "Salary Revision Letter",
  "Promotion Letter",
  "Appraisal",
  "Bonus Letter",
  "Tax Document",
  "Payslip",
  "Medical Certificate",
  "NDA",
  "Education Certificate",
  "Experience Certificate",
  "Performance Review",
  "Other",
];

async function main() {
  console.log("Seeding default document categories...");
  for (const name of DEFAULT_CATEGORIES) {
    await prisma.documentCategory.upsert({
      where: { name },
      update: {},
      create: { name, isCustom: false },
    });
  }
  console.log("Categories seeded successfully!");
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
