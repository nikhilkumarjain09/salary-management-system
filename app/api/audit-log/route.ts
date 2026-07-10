import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/audit-log - Paginated, filterable audit log entries
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Filters
  const entityType = searchParams.get("entityType") || undefined;
  const action = searchParams.get("action") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  // Pagination
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);

  // Build where clause
  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  try {
    // Fetch entries
    const entries = await prisma.auditLogEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = entries.length > limit;
    const results = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // Get total count for display
    const totalHits = await prisma.auditLogEntry.count({ where });

    // Get distinct values for filter dropdowns
    const metadata = searchParams.get("metadata") === "true";
    if (metadata) {
      const entityTypes = await prisma.auditLogEntry.findMany({
        select: { entityType: true },
        distinct: ["entityType"],
      });
      const actions = await prisma.auditLogEntry.findMany({
        select: { action: true },
        distinct: ["action"],
      });
      return NextResponse.json({
        entityTypes: entityTypes.map((e) => e.entityType).sort(),
        actions: actions.map((a) => a.action).sort(),
      });
    }

    return NextResponse.json({
      entries: results,
      nextCursor,
      totalHits,
    });
  } catch (error) {
    console.error("Audit Log API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 },
    );
  }
}
