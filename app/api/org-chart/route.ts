import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/org-chart - Fetch org structure lazy-loaded or search hierarchy paths
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const managerId = searchParams.get("managerId") || "root";
  const search = searchParams.get("search") || undefined;

  try {
    // 1. If search term is specified, find the reporting chain path
    if (search) {
      const match = await prisma.employee.findFirst({
        where: {
          isActive: true,
          OR: [
            { name: { contains: search } },
            { employeeCode: { startsWith: search } },
          ],
        },
        select: { id: true, managerId: true },
      });

      if (!match) {
        return NextResponse.json({ path: [] });
      }

      // Walk up the reporting hierarchy to build the manager path
      const path = [match.id];
      let currentManagerId = match.managerId;
      let depthLimit = 15; // Safeguard against circular references

      while (currentManagerId && depthLimit > 0) {
        path.unshift(currentManagerId);
        const mgr = await prisma.employee.findUnique({
          where: { id: currentManagerId },
          select: { managerId: true },
        });
        currentManagerId = mgr?.managerId || null;
        depthLimit--;
      }

      return NextResponse.json({ path });
    }

    // 2. Otherwise return lazy-load direct report employees
    const employees = await prisma.employee.findMany({
      where: {
        managerId: managerId === "root" ? null : managerId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        department: true,
        level: true,
        _count: {
          select: {
            subordinates: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const results = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      department: emp.department,
      level: emp.level,
      hasReports: emp._count.subordinates > 0,
      reportsCount: emp._count.subordinates,
    }));

    return NextResponse.json({ employees: results });
  } catch (error) {
    console.error("Org Chart API error:", error);
    return NextResponse.json(
      { error: "Failed to load org chart nodes" },
      { status: 500 },
    );
  }
}
