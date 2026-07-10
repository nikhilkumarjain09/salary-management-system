import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") || undefined;
  const level = searchParams.get("level") || undefined;
  const country = searchParams.get("country") || undefined;

  try {
    // 1. Fetch active employees and their latest salaries
    const activeEmployees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(department ? { department } : {}),
        ...(level ? { level } : {}),
        ...(country ? { country } : {}),
      },
      select: {
        id: true,
        department: true,
        level: true,
        country: true,
        salaries: {
          orderBy: { effectiveDate: "desc" },
          take: 1,
          select: {
            baseAmount: true,
            currency: true,
          },
        },
      },
    });

    // 2. Aggregate active employee salaries by department | level | country
    const groupStats = new Map<
      string,
      { totalSalary: number; count: number }
    >();
    for (const emp of activeEmployees) {
      const salary = emp.salaries[0];
      if (!salary) continue;

      const key = `${emp.department}|${emp.level}|${emp.country}`;
      const existing = groupStats.get(key) || { totalSalary: 0, count: 0 };

      existing.totalSalary += salary.baseAmount;
      existing.count += 1;
      groupStats.set(key, existing);
    }

    // 3. Fetch matching market benchmarks
    const benchmarks = await prisma.marketBenchmark.findMany({
      where: {
        ...(department ? { department } : {}),
        ...(level ? { level } : {}),
        ...(country ? { country } : {}),
      },
    });

    // 4. Construct response comparing actual vs benchmark values
    const comparisons = benchmarks.map((bench) => {
      const key = `${bench.department}|${bench.level}|${bench.country}`;
      const stats = groupStats.get(key) || { totalSalary: 0, count: 0 };

      const averageSalary =
        stats.count > 0
          ? Number((stats.totalSalary / stats.count).toFixed(2))
          : 0;

      const variancePercent =
        averageSalary > 0 && bench.benchmarkAmount > 0
          ? Number(
              (
                ((averageSalary - bench.benchmarkAmount) /
                  bench.benchmarkAmount) *
                100
              ).toFixed(1),
            )
          : 0;

      return {
        id: bench.id,
        department: bench.department,
        level: bench.level,
        country: bench.country,
        benchmarkAmount: bench.benchmarkAmount,
        currency: bench.currency,
        percentile: bench.percentile,
        sourceLabel: bench.sourceLabel,
        employeeCount: stats.count,
        averageSalary,
        variancePercent,
      };
    });

    // Metadata details for filtering selectors
    if (searchParams.get("metadata") === "true") {
      const distinctDepts = await prisma.marketBenchmark.findMany({
        select: { department: true },
        distinct: ["department"],
      });
      const distinctLevels = await prisma.marketBenchmark.findMany({
        select: { level: true },
        distinct: ["level"],
      });
      const distinctCountries = await prisma.marketBenchmark.findMany({
        select: { country: true },
        distinct: ["country"],
      });

      return NextResponse.json({
        comparisons,
        metadata: {
          departments: distinctDepts.map((d) => d.department).sort(),
          levels: distinctLevels.map((l) => l.level).sort(),
          countries: distinctCountries.map((c) => c.country).sort(),
        },
      });
    }

    return NextResponse.json({ comparisons });
  } catch (error) {
    console.error("Benchmarking API error:", error);
    return NextResponse.json(
      { error: "Failed to load benchmarking data" },
      { status: 500 },
    );
  }
}
