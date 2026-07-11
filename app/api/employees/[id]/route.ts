import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchService } from "@/lib/search/search";
import { localCache } from "@/lib/cache";
import { updateEmployeeSchema } from "@/lib/validations/employee";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/employees/[id] - Retrieve single employee with manager details and full salary history
export async function GET(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        salaries: {
          orderBy: {
            effectiveDate: "desc",
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Fetch matching compensation band and market benchmark
    const currentSalary = employee.salaries[0];
    let compaRatio = null;
    let band = null;
    let benchmark = null;

    if (currentSalary) {
      band = await prisma.compensationBand.findFirst({
        where: {
          department: employee.department,
          level: employee.level,
          country: employee.country,
        },
      });

      benchmark = await prisma.marketBenchmark.findFirst({
        where: {
          department: employee.department,
          level: employee.level,
          country: employee.country,
        },
      });

      if (band && band.midAmount > 0) {
        compaRatio = Number(
          (currentSalary.baseAmount / band.midAmount).toFixed(3),
        );
      }
    }

    return NextResponse.json({
      ...employee,
      compaRatio,
      band,
      benchmark,
    });
  } catch (error) {
    console.error("Retrieve Employee API error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve employee" },
      { status: 500 },
    );
  }
}

// PATCH /api/employees/[id] - Transactionally update employee details and record audit log
export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();

    // 1. Zod schema validation
    const validation = updateEmployeeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // 2. Transactional execution block
    const updatedEmployee = await prisma.$transaction(async (tx) => {
      const existing = await tx.employee.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error("Employee not found");
      }

      // Update Employee
      const employee = await tx.employee.update({
        where: { id },
        data: validation.data,
      });

      // Create immutable AuditLogEntry
      await tx.auditLogEntry.create({
        data: {
          actorLabel: session.user?.email || "System",
          action: "UPDATE",
          entityType: "EMPLOYEE",
          entityId: employee.id,
          beforeValue: existing as any,
          afterValue: employee as any,
        },
      });

      return employee;
    });

    // 3. Post-commit background synchronization & cache invalidation
    await searchService.syncIndex(updatedEmployee);
    localCache.clear();

    return NextResponse.json(updatedEmployee);
  } catch (error: any) {
    console.error("Update Employee API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update employee" },
      { status: 500 },
    );
  }
}

// DELETE /api/employees/[id] - Transactionally delete employee and write audit log
export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // Create AuditLogEntry before deletion
      await tx.auditLogEntry.create({
        data: {
          actorLabel: session.user?.email || "System",
          action: "DELETE",
          entityType: "EMPLOYEE",
          entityId: id,
          beforeValue: existing as any,
        },
      });

      // Delete the employee
      await tx.employee.delete({
        where: { id },
      });
    });

    // Post-commit search index removal and cache clear
    await searchService.deleteFromIndex(id);
    localCache.clear();

    return NextResponse.json({
      success: true,
      message: "Employee removed successfully.",
    });
  } catch (error: any) {
    console.error("Delete Employee API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete employee" },
      { status: 500 },
    );
  }
}
