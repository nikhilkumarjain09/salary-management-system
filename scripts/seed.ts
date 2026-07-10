import { prisma } from "../lib/prisma";
import { faker, fakerEN_IN } from "@faker-js/faker";

// Configuration arrays and mappings
const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD", rate: 1.0 },
  { code: "IN", name: "India", currency: "INR", rate: 83.0 },
  { code: "UK", name: "United Kingdom", currency: "GBP", rate: 0.78 },
  { code: "DE", name: "Germany", currency: "EUR", rate: 0.92 },
  { code: "SG", name: "Singapore", currency: "SGD", rate: 1.34 },
  { code: "BR", name: "Brazil", currency: "BRL", rate: 5.0 },
];

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
];

const LEVELS = ["L1", "L2", "L3", "L4", "L5"];

// Base midpoint salaries in USD by Level
const LEVEL_BASE_MID: Record<string, number> = {
  L1: 50000,
  L2: 75000,
  L3: 110000,
  L4: 155000,
  L5: 220000,
};

// Target employee count
const TOTAL_EMPLOYEES = 10000;

// Helper to chunk arrays for batch insertion
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function main() {
  console.log("Starting database seeding...");

  // 1. Clean existing database records
  console.log("Cleaning existing database records...");
  await prisma.auditLogEntry.deleteMany();
  await prisma.marketBenchmark.deleteMany();
  await prisma.compensationBand.deleteMany();
  await prisma.salaryRecord.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  console.log("Database cleaned successfully.");

  // 2. Create seed user (HR Manager)
  console.log("Creating default HR Manager user...");
  // Hashed version of 'admin123' (bcrypt)
  const defaultPasswordHash =
    "$2b$10$nvTKkWD05Sp1lzd.XJJMgudGLYzJC.dGCjTv4HztsDDkpPIGr4.FK";
  await prisma.user.create({
    data: {
      email: "hr.manager@acme.com",
      passwordHash: defaultPasswordHash,
    },
  });
  console.log("Default user created (hr.manager@acme.com / admin123).");

  // 3. Generate Employees with levels L5 down to L1
  console.log(`Generating data for ${TOTAL_EMPLOYEES} employees...`);

  // Level distribution targets
  // L5: ~2% (200), L4: ~8% (800), L3: ~25% (2500), L2: ~40% (4000), L1: ~25% (2500)
  const levelCounts = {
    L5: 200,
    L4: 800,
    L3: 2500,
    L2: 4000,
    L1: 2500,
  };

  interface EmployeeGen {
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    level: string;
    country: string;
    startDate: Date;
    isActive: boolean;
    managerId: string | null;
  }

  const generatedEmployees: EmployeeGen[] = [];
  const employeesByLevel: Record<string, EmployeeGen[]> = {
    L1: [],
    L2: [],
    L3: [],
    L4: [],
    L5: [],
  };

  let employeeCounter = 1;

  // Track unique combinations of department/level/country
  const combinationKeys = new Set<string>();

  // Helper to generate a single employee record
  function generateEmployeeBase(level: string): EmployeeGen {
    const countryObj = faker.helpers.arrayElement(COUNTRIES);
    const department = faker.helpers.arrayElement(DEPARTMENTS);
    // Generate mostly (e.g. 85%) Indian names, and 15% standard names
    const useIndianName = Math.random() < 0.85;
    const name = useIndianName
      ? fakerEN_IN.person.fullName()
      : faker.person.fullName();
    const employeeCode = `EMP-${String(employeeCounter++).padStart(5, "0")}`;

    // Start date in the last 5 years
    const startDate = faker.date.past({ years: 5 });

    // Add to unique combinations
    combinationKeys.add(`${department}|${level}|${countryObj.code}`);

    return {
      id: faker.string.uuid(),
      employeeCode,
      name,
      department,
      level,
      country: countryObj.code,
      startDate,
      isActive: true,
      managerId: null,
    };
  }

  // Generate L5s (top of hierarchy, no manager or reports to another L5)
  console.log("Generating level L5 employees...");
  for (let i = 0; i < levelCounts.L5; i++) {
    const emp = generateEmployeeBase("L5");
    generatedEmployees.push(emp);
    employeesByLevel.L5.push(emp);
  }
  // Let L5s report to the CEO (the first L5) except the CEO themselves
  const ceo = employeesByLevel.L5[0];
  for (let i = 1; i < employeesByLevel.L5.length; i++) {
    employeesByLevel.L5[i].managerId = ceo.id;
  }

  // Helper to find a suitable manager from a higher level
  function findManager(
    emp: EmployeeGen,
    potentialManagers: EmployeeGen[],
  ): string {
    // 1. Try to find manager in the same department AND country
    let matches = potentialManagers.filter(
      (m) => m.department === emp.department && m.country === emp.country,
    );

    // 2. Fall back to same department
    if (matches.length === 0) {
      matches = potentialManagers.filter(
        (m) => m.department === emp.department,
      );
    }

    // 3. Fall back to same country
    if (matches.length === 0) {
      matches = potentialManagers.filter((m) => m.country === emp.country);
    }

    // 4. Fall back to any manager
    const manager =
      matches.length > 0
        ? faker.helpers.arrayElement(matches)
        : faker.helpers.arrayElement(potentialManagers);

    return manager.id;
  }

  // Generate L4s reporting to L5s
  console.log("Generating level L4 employees...");
  for (let i = 0; i < levelCounts.L4; i++) {
    const emp = generateEmployeeBase("L4");
    emp.managerId = findManager(emp, employeesByLevel.L5);
    generatedEmployees.push(emp);
    employeesByLevel.L4.push(emp);
  }

  // Generate L3s reporting to L4s
  console.log("Generating level L3 employees...");
  for (let i = 0; i < levelCounts.L3; i++) {
    const emp = generateEmployeeBase("L3");
    emp.managerId = findManager(emp, employeesByLevel.L4);
    generatedEmployees.push(emp);
    employeesByLevel.L3.push(emp);
  }

  // Generate L2s reporting to L3s
  console.log("Generating level L2 employees...");
  for (let i = 0; i < levelCounts.L2; i++) {
    const emp = generateEmployeeBase("L2");
    emp.managerId = findManager(emp, employeesByLevel.L3);
    generatedEmployees.push(emp);
    employeesByLevel.L2.push(emp);
  }

  // Generate L1s reporting to L2s or L3s
  console.log("Generating level L1 employees...");
  const potentialL1Managers = [...employeesByLevel.L2, ...employeesByLevel.L3];
  for (let i = 0; i < levelCounts.L1; i++) {
    const emp = generateEmployeeBase("L1");
    emp.managerId = findManager(emp, potentialL1Managers);
    generatedEmployees.push(emp);
    employeesByLevel.L1.push(emp);
  }

  // 4. Generate Salary Records for each employee
  console.log("Generating Salary history records...");
  interface SalaryRecordGen {
    id: string;
    employeeId: string;
    baseAmount: number;
    currency: string;
    bonusAmount: number;
    baseAmountUSD: number;
    bonusAmountUSD: number;
    effectiveDate: Date;
  }

  const generatedSalaries: SalaryRecordGen[] = [];

  for (const emp of generatedEmployees) {
    const countryObj = COUNTRIES.find((c) => c.code === emp.country)!;
    const baseMidUSD = LEVEL_BASE_MID[emp.level];

    // Determine initial base salary with some variation (+-15%)
    const variationPercent = faker.number.float({ min: -0.15, max: 0.15 });
    const initialBaseUSD = Math.round(baseMidUSD * (1 + variationPercent));

    // Determine bonus percentage based on level
    let bonusPct = 0.05; // L1 default
    if (emp.level === "L2") bonusPct = 0.08;
    else if (emp.level === "L3") bonusPct = 0.12;
    else if (emp.level === "L4") bonusPct = 0.18;
    else if (emp.level === "L5") bonusPct = 0.25;

    const initialBonusUSD = Math.round(initialBaseUSD * bonusPct);

    // Number of historical records (1 to 4)
    const recordsCount = faker.number.int({ min: 1, max: 4 });

    let currentBaseUSD = initialBaseUSD;
    let currentBonusUSD = initialBonusUSD;
    let currentEffectiveDate = new Date(emp.startDate);

    for (let r = 0; r < recordsCount; r++) {
      // If not the first record, add raise and progressive date
      if (r > 0) {
        // Raise percentage (3% to 12%)
        const raisePct = faker.number.float({ min: 0.03, max: 0.12 });
        currentBaseUSD = Math.round(currentBaseUSD * (1 + raisePct));
        currentBonusUSD = Math.round(currentBaseUSD * bonusPct);

        // Effective date is 10-14 months later
        const monthsToAdd = faker.number.int({ min: 10, max: 14 });
        const nextDate = new Date(currentEffectiveDate);
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

        // Prevent salary dates from exceeding today (July 10, 2026)
        if (nextDate > new Date("2026-07-10")) {
          break;
        }
        currentEffectiveDate = nextDate;
      }

      // Convert to local currency
      const baseAmountLocal = Math.round(currentBaseUSD * countryObj.rate);
      const bonusAmountLocal = Math.round(currentBonusUSD * countryObj.rate);

      generatedSalaries.push({
        id: faker.string.uuid(),
        employeeId: emp.id,
        baseAmount: baseAmountLocal,
        currency: countryObj.currency,
        bonusAmount: bonusAmountLocal,
        baseAmountUSD: currentBaseUSD,
        bonusAmountUSD: currentBonusUSD,
        effectiveDate: new Date(currentEffectiveDate),
      });
    }
  }

  // 5. Generate Compensation Bands and Market Benchmarks
  console.log("Generating Compensation Bands and Market Benchmarks...");
  interface CompBandGen {
    id: string;
    department: string;
    level: string;
    country: string;
    minAmount: number;
    midAmount: number;
    maxAmount: number;
    currency: string;
  }

  interface MarketBenchmarkGen {
    id: string;
    department: string;
    level: string;
    country: string;
    benchmarkAmount: number;
    currency: string;
    percentile: number;
    sourceLabel: string;
  }

  const generatedBands: CompBandGen[] = [];
  const generatedBenchmarks: MarketBenchmarkGen[] = [];

  for (const comboKey of combinationKeys) {
    const [department, level, countryCode] = comboKey.split("|");
    const countryObj = COUNTRIES.find((c) => c.code === countryCode)!;
    const baseMidUSD = LEVEL_BASE_MID[level];

    // Local midpoint amount
    const midAmountLocal = Math.round(baseMidUSD * countryObj.rate);
    const minAmountLocal = Math.round(midAmountLocal * 0.8);
    const maxAmountLocal = Math.round(midAmountLocal * 1.2);

    generatedBands.push({
      id: faker.string.uuid(),
      department,
      level,
      country: countryCode,
      minAmount: minAmountLocal,
      midAmount: midAmountLocal,
      maxAmount: maxAmountLocal,
      currency: countryObj.currency,
    });

    // Market Benchmark is around midpoint +-5% with 50th or 75th percentile
    const benchmarkVariation = faker.number.float({ min: -0.05, max: 0.08 });
    const benchmarkAmountLocal = Math.round(
      midAmountLocal * (1 + benchmarkVariation),
    );
    const percentile = faker.helpers.arrayElement([50, 75]);

    generatedBenchmarks.push({
      id: faker.string.uuid(),
      department,
      level,
      country: countryCode,
      benchmarkAmount: benchmarkAmountLocal,
      currency: countryObj.currency,
      percentile,
      sourceLabel: "Seeded illustrative data — not a live market feed",
    });
  }

  // 6. Perform Chunked Batch Insertions
  console.log("Inserting Employees into database...");
  const employeeChunks = chunkArray(generatedEmployees, 500);
  let employeeProgress = 0;
  for (const chunk of employeeChunks) {
    await prisma.employee.createMany({ data: chunk });
    employeeProgress += chunk.length;
    console.log(
      `  Inserted ${employeeProgress}/${generatedEmployees.length} employees...`,
    );
  }

  console.log("Inserting Salary Records into database...");
  const salaryChunks = chunkArray(generatedSalaries, 500);
  let salaryProgress = 0;
  for (const chunk of salaryChunks) {
    await prisma.salaryRecord.createMany({ data: chunk });
    salaryProgress += chunk.length;
    console.log(
      `  Inserted ${salaryProgress}/${generatedSalaries.length} salary records...`,
    );
  }

  console.log("Inserting Compensation Bands into database...");
  const bandChunks = chunkArray(generatedBands, 500);
  let bandProgress = 0;
  for (const chunk of bandChunks) {
    await prisma.compensationBand.createMany({ data: chunk });
    bandProgress += chunk.length;
    console.log(
      `  Inserted ${bandProgress}/${generatedBands.length} compensation bands...`,
    );
  }

  console.log("Inserting Market Benchmarks into database...");
  const benchmarkChunks = chunkArray(generatedBenchmarks, 500);
  let benchmarkProgress = 0;
  for (const chunk of benchmarkChunks) {
    await prisma.marketBenchmark.createMany({ data: chunk });
    benchmarkProgress += chunk.length;
    console.log(
      `  Inserted ${benchmarkProgress}/${generatedBenchmarks.length} market benchmarks...`,
    );
  }

  // 7. Write an Audit Log entry for the seeding execution
  console.log("Writing Audit Log for seeding execution...");
  await prisma.auditLogEntry.create({
    data: {
      actorLabel: "System Seeder",
      action: "SEED",
      entityType: "DATABASE",
      entityId: "SYSTEM",
      afterValue: {
        employeesCount: generatedEmployees.length,
        salariesCount: generatedSalaries.length,
        bandsCount: generatedBands.length,
        benchmarksCount: generatedBenchmarks.length,
      },
    },
  });

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
