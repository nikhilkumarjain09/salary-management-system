import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dimensions, metrics } = await req.json();

    if (!dimensions || !Array.isArray(dimensions) || dimensions.length === 0) {
      return NextResponse.json(
        { error: "At least one dimension must be selected." },
        { status: 400 },
      );
    }
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: "At least one metric must be selected." },
        { status: 400 },
      );
    }

    const validDimensions = ["department", "country", "level"];
    const dims = dimensions.filter((d) => validDimensions.includes(d));

    if (dims.length === 0) {
      return NextResponse.json(
        { error: "Invalid dimensions selected." },
        { status: 400 },
      );
    }

    const selectDims = dims.map((d) => `e."${d}"`).join(", ");
    const groupDims = dims.map((d) => `"${d}"`).join(", ");
    const joinDims = dims.map((d) => `a."${d}" = m."${d}"`).join(" AND ");

    // Execute dynamic SQL aggregates safely (identifiers are pre-validated white-lists)
    const sql = `
      WITH BaseData AS (
        SELECT 
          e."department",
          e."country",
          e."level",
          s."baseAmountUSD",
          (s."baseAmount" / b."midAmount") as individualCompa
        FROM "SalaryRecord" s
        INNER JOIN (
          SELECT "employeeId", MAX("effectiveDate") as maxDate
          FROM "SalaryRecord"
          GROUP BY "employeeId"
        ) latest ON s."employeeId" = latest."employeeId" AND s."effectiveDate" = latest.maxDate
        INNER JOIN "Employee" e ON s."employeeId" = e.id
        LEFT JOIN "CompensationBand" b ON e."department" = b."department" AND e."level" = b."level" AND e."country" = b."country"
        WHERE e."isActive" = true
      ),
      OrderedSalaries AS (
        SELECT 
          department,
          country,
          level,
          baseAmountUSD,
          ROW_NUMBER() OVER (PARTITION BY ${selectDims} ORDER BY baseAmountUSD) as row_num,
          COUNT(*) OVER (PARTITION BY ${selectDims}) as group_count
        FROM BaseData
      ),
      Medians AS (
        SELECT 
          ${groupDims},
          AVG(baseAmountUSD) as medianPayUSD
        FROM OrderedSalaries
        WHERE row_num IN ( (group_count + 1) / 2, (group_count + 2) / 2 )
        GROUP BY ${groupDims}
      ),
      AveragesAndCounts AS (
        SELECT 
          ${selectDims},
          AVG(baseAmountUSD) as avgPayUSD,
          COUNT(*) as headcount,
          AVG(individualCompa) as avgCompaRatio
        FROM BaseData
        GROUP BY ${selectDims}
      )
      SELECT 
        a.*,
        m.medianPayUSD
      FROM AveragesAndCounts a
      LEFT JOIN Medians m ON ${joinDims}
    `;

    const results = await prisma.$queryRawUnsafe<any[]>(sql);

    // Format output based on requested metrics
    const formatted = results.map((row) => {
      const entry: any = {};
      dims.forEach((d) => {
        entry[d] = row[d];
      });

      if (metrics.includes("avgPay")) {
        entry.avgPayUSD = Number(row.avgPayUSD ? row.avgPayUSD.toFixed(0) : 0);
      }
      if (metrics.includes("medianPay")) {
        entry.medianPayUSD = Number(
          row.medianPayUSD ? row.medianPayUSD.toFixed(0) : 0,
        );
      }
      if (metrics.includes("headcount")) {
        entry.headcount = Number(row.headcount || 0);
      }
      if (metrics.includes("compaRatio")) {
        entry.avgCompaRatio = Number(
          row.avgCompaRatio ? (row.avgCompaRatio * 100).toFixed(1) : 100.0,
        );
      }

      return entry;
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Report run failed:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
