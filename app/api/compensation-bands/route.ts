import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateBandSchema = z.object({
  minAmount: z
    .number()
    .positive("Min amount must be greater than 0")
    .optional(),
  midAmount: z
    .number()
    .positive("Mid amount must be greater than 0")
    .optional(),
  maxAmount: z
    .number()
    .positive("Max amount must be greater than 0")
    .optional(),
  currency: z.string().min(1).optional(),
});

// GET /api/compensation-bands - List all bands with optional filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") || undefined;
  const level = searchParams.get("level") || undefined;
  const country = searchParams.get("country") || undefined;

  // Metadata request for filter dropdowns
  if (searchParams.get("metadata") === "true") {
    const departments = await prisma.compensationBand.findMany({
      select: { department: true },
      distinct: ["department"],
    });
    const levels = await prisma.compensationBand.findMany({
      select: { level: true },
      distinct: ["level"],
    });
    const countries = await prisma.compensationBand.findMany({
      select: { country: true },
      distinct: ["country"],
    });
    return NextResponse.json({
      departments: departments.map((d) => d.department).sort(),
      levels: levels.map((l) => l.level).sort(),
      countries: countries.map((c) => c.country).sort(),
    });
  }

  try {
    const where: Record<string, string> = {};
    if (department) where.department = department;
    if (level) where.level = level;
    if (country) where.country = country;

    const bands = await prisma.compensationBand.findMany({
      where,
      orderBy: [{ department: "asc" }, { level: "asc" }, { country: "asc" }],
    });

    return NextResponse.json({ bands });
  } catch (error) {
    console.error("Compensation Bands API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch compensation bands" },
      { status: 500 },
    );
  }
}

// PATCH /api/compensation-bands - Update a band by id
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...changes } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Band id is required" },
        { status: 400 },
      );
    }

    const validation = updateBandSchema.safeParse(changes);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Validate min <= mid <= max if all provided or partial
    const updatedBand = await prisma.$transaction(async (tx) => {
      const existing = await tx.compensationBand.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error("Compensation band not found");
      }

      const newMin = validation.data.minAmount ?? existing.minAmount;
      const newMid = validation.data.midAmount ?? existing.midAmount;
      const newMax = validation.data.maxAmount ?? existing.maxAmount;

      if (newMin > newMid || newMid > newMax) {
        throw new Error("Band amounts must satisfy: min <= mid <= max");
      }

      const band = await tx.compensationBand.update({
        where: { id },
        data: validation.data,
      });

      // Audit log entry
      await tx.auditLogEntry.create({
        data: {
          actorLabel: session.user?.email || "System",
          action: "UPDATE",
          entityType: "COMPENSATION_BAND",
          entityId: band.id,
          beforeValue: existing as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma Json field
          afterValue: band as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma Json field
        },
      });

      return band;
    });

    return NextResponse.json(updatedBand);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update band";
    console.error("Update Band API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
