import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchService } from "@/lib/search/search";
import { localCache } from "@/lib/cache";
import { createEmployeeSchema } from "@/lib/validations/employee";
import { convertToUSD } from "@/lib/currency";

// GET /api/employees - Paginated list of employees with search and filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const metadata = searchParams.get("metadata") === "true";

  // 1. Handle Metadata Caching
  if (metadata) {
    const cachedMetadata = localCache.get<{
      departments: string[];
      countries: string[];
      levels: string[];
    }>("filter_metadata");

    if (cachedMetadata) {
      return NextResponse.json(cachedMetadata);
    }

    try {
      const deptsResult = await prisma.employee.findMany({
        select: { department: true },
        distinct: ["department"],
      });
      const countriesResult = await prisma.employee.findMany({
        select: { country: true },
        distinct: ["country"],
      });
      const levelsResult = await prisma.employee.findMany({
        select: { level: true },
        distinct: ["level"],
      });

      const filterMetadata = {
        departments: deptsResult.map((d) => d.department).sort(),
        countries: countriesResult.map((c) => c.country).sort(),
        levels: levelsResult.map((l) => l.level).sort(),
      };

      // Cache metadata for 10 minutes
      localCache.set("filter_metadata", filterMetadata, 600000);

      return NextResponse.json(filterMetadata);
    } catch (err) {
      console.error("Failed to load filter metadata:", err);
      return NextResponse.json(
        { error: "Failed to load metadata" },
        { status: 500 },
      );
    }
  }

  // 2. Parse query filters and paging arguments
  const query = searchParams.get("query") || "";
  const department = searchParams.get("department") || undefined;
  const level = searchParams.get("level") || undefined;
  const country = searchParams.get("country") || undefined;
  const isActiveStr = searchParams.get("isActive");
  const isActive =
    isActiveStr === "true" ? true : isActiveStr === "false" ? false : undefined;
  const startDateMin = searchParams.get("startDateMin") || undefined;
  const startDateMax = searchParams.get("startDateMax") || undefined;
  const outsideBand = searchParams.get("outsideBand") || undefined;
  const exactMatch = searchParams.get("exactMatch") === "true";

  const cursor = searchParams.get("cursor") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = (searchParams.get("sortOrder") || "asc") as "asc" | "desc";

  try {
    let matchIds: string[] | undefined = undefined;
    if (outsideBand === "true" || outsideBand === "false") {
      const employeesWithSalaries = await prisma.employee.findMany({
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
            },
          },
        },
      });

      const bands = await prisma.compensationBand.findMany();
      const bandMap = new Map(
        bands.map((b) => [`${b.department}|${b.level}|${b.country}`, b]),
      );

      const computedIds: string[] = [];
      for (const emp of employeesWithSalaries) {
        const salary = emp.salaries[0];
        const band = bandMap.get(
          `${emp.department}|${emp.level}|${emp.country}`,
        );
        if (salary && band && band.midAmount > 0) {
          const compaRatio = salary.baseAmount / band.midAmount;
          const isOutside = compaRatio < 0.8 || compaRatio > 1.2;
          if (outsideBand === "true" && isOutside) {
            computedIds.push(emp.id);
          } else if (outsideBand === "false" && !isOutside) {
            computedIds.push(emp.id);
          }
        }
      }
      matchIds = computedIds;
    }

    // 3. Delegate search request to configured SearchService
    const result = await searchService.search({
      query,
      filters: {
        department,
        level,
        country,
        isActive,
        startDateMin,
        startDateMax,
        ids: matchIds,
        exactMatch,
      },
      cursor,
      limit,
      sortBy,
      sortOrder,
    });

    // 4. Optionally enrich with compa-ratio data
    const enrichCompa = searchParams.get("enrichCompa") === "true";
    if (enrichCompa && result.employees.length > 0) {
      const empIds = result.employees.map(
        (e: Record<string, unknown>) => e.id as string,
      );

      // Fetch latest salary for each employee
      const salaries = await prisma.salaryRecord.findMany({
        where: { employeeId: { in: empIds } },
        orderBy: { effectiveDate: "desc" },
        distinct: ["employeeId"],
        select: {
          employeeId: true,
          baseAmount: true,
          currency: true,
        },
      });
      const salaryMap = new Map(salaries.map((s) => [s.employeeId, s]));

      // Fetch all relevant bands
      const bandKeys = [
        ...new Set(
          result.employees.map(
            (e: Record<string, unknown>) =>
              `${e.department}|${e.level}|${e.country}`,
          ),
        ),
      ];
      const bands = await prisma.compensationBand.findMany({
        where: {
          OR: bandKeys.map((key) => {
            const [dept, lvl, ctry] = (key as string).split("|");
            return { department: dept, level: lvl, country: ctry };
          }),
        },
      });
      const bandMap = new Map(
        bands.map((b) => [`${b.department}|${b.level}|${b.country}`, b]),
      );

      // Enrich each employee
      result.employees = result.employees.map(
        (emp: Record<string, unknown>) => {
          const salary = salaryMap.get(emp.id as string);
          const band = bandMap.get(
            `${emp.department}|${emp.level}|${emp.country}`,
          );

          let compaRatio: number | null = null;
          let bandStatus: string | null = null;

          if (salary && band && band.midAmount > 0) {
            compaRatio = Number(
              (salary.baseAmount / band.midAmount).toFixed(3),
            );
            if (compaRatio < 0.8) bandStatus = "below";
            else if (compaRatio > 1.2) bandStatus = "above";
            else bandStatus = "within";
          }

          return { ...emp, compaRatio, bandStatus };
        },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to query employees" },
      { status: 500 },
    );
  }
}

// POST /api/employees - Transactionally create employee, initial salary, and audit log
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 1. Zod schema validation
    const validation = createEmployeeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      name,
      employeeCode,
      department,
      level,
      country,
      startDate,
      isActive,
      managerId,
      initialSalary,
      currency,
    } = validation.data;

    // 2. Transactional execution block
    const createdEmployee = await prisma.$transaction(async (tx) => {
      // Check if employeeCode already exists
      const existing = await tx.employee.findUnique({
        where: { employeeCode },
      });
      if (existing) {
        throw new Error(`Employee Code ${employeeCode} is already assigned.`);
      }

      // Create Employee
      const employee = await tx.employee.create({
        data: {
          name,
          employeeCode,
          department,
          level,
          country,
          startDate,
          isActive,
          managerId,
        },
      });

      // Calculate USD conversions
      const baseUSD = convertToUSD(initialSalary, currency);
      const bonusUSD = convertToUSD(0, currency); // 0 initial bonus unless specified

      // Create initial append-only SalaryRecord
      await tx.salaryRecord.create({
        data: {
          employeeId: employee.id,
          baseAmount: initialSalary,
          currency,
          bonusAmount: 0,
          baseAmountUSD: baseUSD,
          bonusAmountUSD: bonusUSD,
          effectiveDate: startDate,
        },
      });

      // Create immutable AuditLogEntry
      await tx.auditLogEntry.create({
        data: {
          actorLabel: session.user?.email || "System",
          action: "CREATE",
          entityType: "EMPLOYEE",
          entityId: employee.id,
          // beforeValue is omitted to store DB null
          afterValue: {
            id: employee.id,
            employeeCode: employee.employeeCode,
            name: employee.name,
            department: employee.department,
            level: employee.level,
            country: employee.country,
            startDate: employee.startDate,
            isActive: employee.isActive,
            managerId: employee.managerId,
            initialSalary: {
              baseAmount: initialSalary,
              currency,
            },
          } as any,
        },
      });

      return employee;
    });

    // 3. Post-commit background synchronization & cache invalidation
    await searchService.syncIndex(createdEmployee);
    localCache.clear();

    return NextResponse.json(createdEmployee, { status: 201 });
  } catch (error: any) {
    console.error("Create Employee API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create employee" },
      { status: 500 },
    );
  }
}
