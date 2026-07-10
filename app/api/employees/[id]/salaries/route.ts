import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localCache } from "@/lib/cache";
import { convertToUSD } from "@/lib/currency";
import { z } from "zod";

const createSalarySchema = z.object({
  baseAmount: z.number().positive("Base salary must be greater than 0"),
  bonusAmount: z.number().nonnegative("Bonus must be 0 or greater").default(0),
  effectiveDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Effective date must be a valid date",
  }),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/employees/[id]/salaries - Append a new salary record
export async function POST(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();

    const validation = createSalarySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { baseAmount, bonusAmount, effectiveDate } = validation.data;

    const createdRecord = await prisma.$transaction(async (tx) => {
      // 1. Fetch employee and verify existence
      const employee = await tx.employee.findUnique({
        where: { id },
        include: {
          salaries: {
            orderBy: { effectiveDate: "desc" },
            take: 1,
          },
        },
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      // Use the currency of the latest salary record, default to USD
      const currency = employee.salaries[0]?.currency || "USD";

      // 2. Compute USD values
      const baseAmountUSD = convertToUSD(baseAmount, currency);
      const bonusAmountUSD = convertToUSD(bonusAmount, currency);

      // 3. Create the SalaryRecord
      const record = await tx.salaryRecord.create({
        data: {
          employeeId: id,
          baseAmount,
          bonusAmount,
          currency,
          baseAmountUSD,
          bonusAmountUSD,
          effectiveDate: new Date(effectiveDate),
        },
      });

      // 4. Write to AuditLogEntry
      await tx.auditLogEntry.create({
        data: {
          actorLabel: session.user?.email || "System",
          action: "CREATE",
          entityType: "SALARY_RECORD",
          entityId: record.id,
          afterValue: record as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma Json
        },
      });

      return record;
    });

    localCache.clear();

    return NextResponse.json(createdRecord, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to record salary change";
    console.error("Salary Change API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
