import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // 1. Get aggregate counts
    const expiredCount = await prisma.document.count({
      where: { expiryDate: { lt: now } },
    });

    const expiringSoonCount = await prisma.document.count({
      where: {
        expiryDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
    });

    const validCount = await prisma.document.count({
      where: {
        OR: [
          { expiryDate: { gt: thirtyDaysFromNow } },
          { expiryDate: null },
        ],
      },
    });

    // 2. Get top 6 upcoming/expired documents
    const documents = await prisma.document.findMany({
      where: {
        expiryDate: { not: null },
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
        category: true,
      },
      orderBy: {
        expiryDate: "asc",
      },
      take: 6,
    });

    return NextResponse.json({
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
      valid: validCount,
      upcoming: documents,
    });
  } catch (err) {
    console.error("Failed to load document expirations:", err);
    return NextResponse.json(
      { error: "Failed to load document expirations" },
      { status: 500 },
    );
  }
}
