import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchService } from "@/lib/search/search";
import { localCache } from "@/lib/cache";
import { createEmployeeSchema } from "@/lib/validations/employee";
import { convertToUSD } from "@/lib/currency";
import { z } from "zod";

const bulkImportSchema = z.array(createEmployeeSchema);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allowed roles can upload bulk employees
  const allowedRoles = ["HR_ADMIN", "HR_MANAGER"];
  const userRole = (session.user as any)?.role || "HR_MANAGER";
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges to import employees" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();

    // Validate request body
    const validation = bulkImportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed for one or more employees",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const importData = validation.data;
    const actorEmail = session.user?.email || "System";

    const createdEmployees = await prisma.$transaction(async (tx) => {
      // 1. Check for duplicates in the imported batch itself
      const batchCodes = importData.map((e) => e.employeeCode);
      const uniqueBatchCodes = new Set(batchCodes);
      if (uniqueBatchCodes.size !== batchCodes.length) {
        throw new Error("Duplicate Employee Codes found in the upload batch.");
      }

      // 2. Check for duplicates in the database
      const existing = await tx.employee.findMany({
        where: { employeeCode: { in: batchCodes } },
        select: { employeeCode: true },
      });

      if (existing.length > 0) {
        const codesStr = existing.map((e) => e.employeeCode).join(", ");
        throw new Error(
          `The following Employee Codes already exist in the database: ${codesStr}`,
        );
      }

      const employeesCreated = [];

      for (const emp of importData) {
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
        } = emp;

        // Create the employee record
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
        const bonusUSD = convertToUSD(0, currency);

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
            actorLabel: actorEmail,
            action: "CREATE",
            entityType: "EMPLOYEE",
            entityId: employee.id,
            afterValue: {
              id: employee.id,
              employeeCode,
              name,
              department,
              level,
              country,
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

        employeesCreated.push(employee);
      }

      return employeesCreated;
    });

    // 3. Post-commit background synchronization & cache invalidation
    for (const employee of createdEmployees) {
      await searchService.syncIndex(employee);
    }
    localCache.clear();

    return NextResponse.json({
      success: true,
      count: createdEmployees.length,
      employees: createdEmployees,
    });
  } catch (err: any) {
    console.error("Bulk import failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to import employees" },
      { status: 400 },
    );
  }
}
