import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Headline Metrics - Headcount, Total Cost, Average Compa-Ratio
    const headcountRaw = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*) as count FROM "Employee" WHERE "isActive" = ${true}`;
    const headcount = Number(headcountRaw[0]?.count || 0);

    const totalCostRaw = await prisma.$queryRaw<{ totalCost: number | null }[]>`
      SELECT SUM(s."baseAmountUSD" + s."bonusAmountUSD") as "totalCost"
      FROM "SalaryRecord" s
      INNER JOIN (
        SELECT "employeeId", MAX("effectiveDate") as maxDate
        FROM "SalaryRecord"
        GROUP BY "employeeId"
      ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
      INNER JOIN "Employee" e ON s."employeeId" = e.id
      WHERE e."isActive" = ${true}
    `;
    const totalCost = totalCostRaw[0]?.totalCost || 0;

    // Compa-Ratio aggregate
    // Average pay / Midpoint pay of bands. To simplify in database:
    // Join latest salary with matching compensation band midAmount
    const compaRatioRaw = await prisma.$queryRaw<{ avgRatio: number }[]>`
      SELECT AVG(s."baseAmount" / b."midAmount") as "avgRatio"
      FROM "SalaryRecord" s
      INNER JOIN (
        SELECT "employeeId", MAX("effectiveDate") as maxDate
        FROM "SalaryRecord"
        GROUP BY "employeeId"
      ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
      INNER JOIN "Employee" e ON s."employeeId" = e.id
      INNER JOIN "CompensationBand" b ON e."department" = b."department" AND e."level" = b."level" AND e."country" = b."country"
      WHERE e."isActive" = ${true} AND b."midAmount" > 0
    `;
    const averageCompa = Number(
      ((compaRatioRaw[0]?.avgRatio || 1.0) * 100).toFixed(1),
    );

    // 2. Average/Median Pay by Department
    const deptAverageRaw = await prisma.$queryRaw<
      { department: string; avgPay: number }[]
    >`
      SELECT e."department", AVG(s."baseAmountUSD") as "avgPay"
      FROM "SalaryRecord" s
      INNER JOIN (
        SELECT "employeeId", MAX("effectiveDate") as maxDate
        FROM "SalaryRecord"
        GROUP BY "employeeId"
      ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
      INNER JOIN "Employee" e ON s."employeeId" = e.id
      WHERE e."isActive" = ${true}
      GROUP BY e."department"
    `;

    const deptMedianRaw = await prisma.$queryRaw<
      { department: string; medianPay: number }[]
    >`
      WITH OrderedSalaries AS (
        SELECT 
          e."department",
          s."baseAmountUSD",
          ROW_NUMBER() OVER (PARTITION BY e."department" ORDER BY s."baseAmountUSD") as row_num,
          COUNT(*) OVER (PARTITION BY e."department") as dept_count
        FROM "SalaryRecord" s
        INNER JOIN (
          SELECT "employeeId", MAX("effectiveDate") as maxDate
          FROM "SalaryRecord"
          GROUP BY "employeeId"
        ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
        INNER JOIN "Employee" e ON s."employeeId" = e.id
        WHERE e."isActive" = ${true}
      )
      SELECT "department", AVG("baseAmountUSD") as "medianPay"
      FROM OrderedSalaries
      WHERE row_num IN ( (dept_count + 1) / 2, (dept_count + 2) / 2 )
      GROUP BY "department"
    `;

    // Map departments together
    const deptMap = new Map<string, { average: number; median: number }>();
    deptAverageRaw.forEach((d: { department: string; avgPay: number }) =>
      deptMap.set(d.department, { average: d.avgPay, median: 0 }),
    );
    deptMedianRaw.forEach((d: { department: string; medianPay: number }) => {
      const existing = deptMap.get(d.department) || { average: 0, median: 0 };
      existing.median = d.medianPay;
      deptMap.set(d.department, existing);
    });

    const departmentStats = Array.from(deptMap.entries()).map(
      ([dept, stats]) => ({
        department: dept,
        average: Number(stats.average.toFixed(0)),
        median: Number(stats.median.toFixed(0)),
      }),
    );

    // 3. Average/Median Pay by Country (Normalized to USD)
    const countryAverageRaw = await prisma.$queryRaw<
      { country: string; avgPay: number }[]
    >`
      SELECT e."country", AVG(s."baseAmountUSD") as "avgPay"
      FROM "SalaryRecord" s
      INNER JOIN (
        SELECT "employeeId", MAX("effectiveDate") as maxDate
        FROM "SalaryRecord"
        GROUP BY "employeeId"
      ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
      INNER JOIN "Employee" e ON s."employeeId" = e.id
      WHERE e."isActive" = ${true}
      GROUP BY e."country"
    `;

    const countryMedianRaw = await prisma.$queryRaw<
      { country: string; medianPay: number }[]
    >`
      WITH OrderedSalaries AS (
        SELECT 
          e."country",
          s."baseAmountUSD",
          ROW_NUMBER() OVER (PARTITION BY e."country" ORDER BY s."baseAmountUSD") as row_num,
          COUNT(*) OVER (PARTITION BY e."country") as country_count
        FROM "SalaryRecord" s
        INNER JOIN (
          SELECT "employeeId", MAX("effectiveDate") as maxDate
          FROM "SalaryRecord"
          GROUP BY "employeeId"
        ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
        INNER JOIN "Employee" e ON s."employeeId" = e.id
        WHERE e."isActive" = ${true}
      )
      SELECT "country", AVG("baseAmountUSD") as "medianPay"
      FROM OrderedSalaries
      WHERE row_num IN ( (country_count + 1) / 2, (country_count + 2) / 2 )
      GROUP BY "country"
    `;

    const countryMap = new Map<string, { average: number; median: number }>();
    countryAverageRaw.forEach((c: { country: string; avgPay: number }) =>
      countryMap.set(c.country, { average: c.avgPay, median: 0 }),
    );
    countryMedianRaw.forEach((c: { country: string; medianPay: number }) => {
      const existing = countryMap.get(c.country) || { average: 0, median: 0 };
      existing.median = c.medianPay;
      countryMap.set(c.country, existing);
    });

    const countryStats = Array.from(countryMap.entries()).map(
      ([country, stats]) => ({
        country,
        average: Number(stats.average.toFixed(0)),
        median: Number(stats.median.toFixed(0)),
      }),
    );

    // 4. Headcount Cost Trend over the Last 12 Months
    const isPostgres =
      process.env.DATABASE_URL?.startsWith("postgres") || false;
    let trendRaw: {
      month: string;
      totalCost: number | null;
      headcount: bigint;
    }[] = [];

    if (isPostgres) {
      trendRaw = await prisma.$queryRaw<
        { month: string; totalCost: number | null; headcount: bigint }[]
      >`
        WITH months AS (
          SELECT (generate_series(
            date_trunc('month', current_date) - INTERVAL '11 months',
            date_trunc('month', current_date),
            INTERVAL '1 month'
          ))::date as date
        )
        SELECT 
          to_char(m.date, 'YYYY-MM-DD') as month,
          (
            SELECT SUM(s."baseAmountUSD") 
            FROM "SalaryRecord" s
            INNER JOIN "Employee" e ON s."employeeId" = e.id
            WHERE s."effectiveDate" <= (m.date + INTERVAL '1 month' - INTERVAL '1 day')::date
              AND e."isActive" = true
              AND NOT EXISTS (
                SELECT 1 FROM "SalaryRecord" s2
                WHERE s2."employeeId" = s."employeeId"
                  AND s2."effectiveDate" <= (m.date + INTERVAL '1 month' - INTERVAL '1 day')::date
                  AND s2."effectiveDate" > s."effectiveDate"
              )
          ) as "totalCost",
          (
            SELECT COUNT(e.id)
            FROM "Employee" e
            WHERE e."startDate" <= (m.date + INTERVAL '1 month' - INTERVAL '1 day')::date
              AND e."isActive" = true
          ) as headcount
        FROM months m
      `;
    } else {
      trendRaw = await prisma.$queryRaw<
        { month: string; totalCost: number | null; headcount: bigint }[]
      >`
        WITH RECURSIVE months(date) AS (
          SELECT date('now', 'start of month', '-11 months')
          UNION ALL
          SELECT date(date, '+1 month')
          FROM months
          WHERE date < date('now', 'start of month')
        )
        SELECT 
          m.date as month,
          (
            SELECT SUM(s."baseAmountUSD") 
            FROM "SalaryRecord" s
            INNER JOIN "Employee" e ON s."employeeId" = e.id
            WHERE s."effectiveDate" <= date(m.date, '+1 month', '-1 day')
              AND e."isActive" = 1
              AND NOT EXISTS (
                SELECT 1 FROM "SalaryRecord" s2
                WHERE s2."employeeId" = s."employeeId"
                  AND s2."effectiveDate" <= date(m.date, '+1 month', '-1 day')
                  AND s2."effectiveDate" > s."effectiveDate"
              )
          ) as totalCost,
          (
            SELECT COUNT(e.id)
            FROM "Employee" e
            WHERE e."startDate" <= date(m.date, '+1 month', '-1 day')
              AND e."isActive" = 1
          ) as headcount
        FROM months m
      `;
    }

    const monthlyTrend = trendRaw.map((t) => ({
      month: new Date(t.month).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      headcount: Number(t.headcount),
      costUSD: t.totalCost || 0,
    }));

    // 5. Pay Equity View (variance spread by department + level across countries)
    const equityRaw = await prisma.$queryRaw<
      {
        department: string;
        level: string;
        minCountryPay: number;
        maxCountryPay: number;
        absoluteSpread: number;
        ratioSpread: number;
      }[]
    >`
      WITH CountryAverages AS (
        SELECT 
          e."department",
          e."level",
          e."country",
          AVG(s."baseAmountUSD") as "avgPay"
        FROM "SalaryRecord" s
        INNER JOIN (
          SELECT "employeeId", MAX("effectiveDate") as maxDate
          FROM "SalaryRecord"
          GROUP BY "employeeId"
        ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
        INNER JOIN "Employee" e ON s."employeeId" = e.id
        WHERE e."isActive" = ${true}
        GROUP BY e."department", e."level", e."country"
      )
      SELECT 
        department,
        level,
        MIN("avgPay") as "minCountryPay",
        MAX("avgPay") as "maxCountryPay",
        (MAX("avgPay") - MIN("avgPay")) as "absoluteSpread",
        (MAX("avgPay") / MIN("avgPay")) as "ratioSpread"
      FROM CountryAverages
      GROUP BY department, level
      ORDER BY "ratioSpread" DESC
    `;

    const payEquity = equityRaw.map((e) => ({
      department: e.department,
      level: e.level,
      minPayUSD: Number(e.minCountryPay.toFixed(0)),
      maxPayUSD: Number(e.maxCountryPay.toFixed(0)),
      spreadUSD: Number(e.absoluteSpread.toFixed(0)),
      ratio: Number(e.ratioSpread.toFixed(2)),
      flagged: e.ratioSpread > 1.25, // flagged if highest country avg pay is > 25% higher than lowest country avg pay for same role+level
    }));

    return NextResponse.json({
      headcount,
      totalMonthlyCostUSD: Number(totalCost.toFixed(0)),
      averageCompaRatio: averageCompa,
      departmentStats,
      countryStats,
      monthlyTrend,
      payEquity,
    });
  } catch (error) {
    console.error("Analytics precomputed aggregates query failed:", error);
    return NextResponse.json(
      { error: "Failed to load precomputed analytics aggregates" },
      { status: 500 },
    );
  }
}
