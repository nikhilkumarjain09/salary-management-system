import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchService } from "@/lib/search/search";
import { localCache } from "@/lib/cache";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one employee must be selected"),
  changes: z
    .object({
      department: z.string().min(1).optional(),
      level: z.enum(["L1", "L2", "L3", "L4", "L5"]).optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (data) =>
        data.department !== undefined ||
        data.level !== undefined ||
        data.isActive !== undefined,
      { message: "At least one change must be specified" },
    ),
});

// PATCH /api/employees/bulk - Bulk update employees with audit logging
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate request body
    const validation = bulkUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { ids, changes } = validation.data;

    // Build the update data object (only defined fields)
    const updateData: Record<string, string | boolean> = {};
    if (changes.department !== undefined)
      updateData.department = changes.department;
    if (changes.level !== undefined) updateData.level = changes.level;
    if (changes.isActive !== undefined) updateData.isActive = changes.isActive;

    // Transactional: update each employee individually for before/after audit
    const updatedEmployees = await prisma.$transaction(async (tx) => {
      const existing = await tx.employee.findMany({
        where: { id: { in: ids } },
      });

      if (existing.length === 0) {
        throw new Error("No matching employees found");
      }

      const results = [];

      for (const emp of existing) {
        const updated = await tx.employee.update({
          where: { id: emp.id },
          data: updateData,
        });

        // Create one AuditLogEntry per employee
        await tx.auditLogEntry.create({
          data: {
            actorLabel: session.user?.email || "System",
            action: "BULK_UPDATE",
            entityType: "EMPLOYEE",
            entityId: emp.id,
            beforeValue: emp as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma Json field
            afterValue: updated as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma Json field
          },
        });

        results.push(updated);
      }

      return results;
    });

    // Post-commit: sync each employee to search index (fire-and-forget)
    for (const emp of updatedEmployees) {
      searchService.syncIndex(emp).catch((err: unknown) => {
        console.error(
          `[BulkUpdate] Search index sync failed for ${emp.id}:`,
          err,
        );
      });
    }

    localCache.clear();

    return NextResponse.json({
      updated: updatedEmployees.length,
      employees: updatedEmployees,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to bulk update";
    console.error("Bulk Update API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
