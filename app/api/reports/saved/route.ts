import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports/saved - Get all saved reports
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await prisma.savedReport.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to load saved reports:", error);
    return NextResponse.json(
      { error: "Failed to load saved reports" },
      { status: 500 },
    );
  }
}

// POST /api/reports/saved - Save a new report definition
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, definition } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "A valid report name is required." },
        { status: 400 },
      );
    }
    if (!definition || typeof definition !== "object") {
      return NextResponse.json(
        { error: "A valid report definition is required." },
        { status: 400 },
      );
    }

    const report = await prisma.$transaction(async (tx) => {
      const rep = await tx.savedReport.create({
        data: {
          name,
          definition: JSON.stringify(definition),
        },
      });

      await tx.auditLogEntry.create({
        data: {
          actorLabel: session.user?.email || "System",
          action: "CREATE",
          entityType: "SAVED_REPORT",
          entityId: rep.id,
          afterValue: rep as any,
        },
      });

      return rep;
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Failed to save report:", error);
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 },
    );
  }
}
