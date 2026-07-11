import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await prisma.documentCategory.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (err) {
    console.error("Failed to load categories:", err);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only HR Admin or HR Manager can create custom categories
  const role = (session.user as any)?.role;
  if (role !== "HR_ADMIN" && role !== "HR_MANAGER") {
    return NextResponse.json(
      { error: "Forbidden: HR access required" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const validation = createCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name } = validation.data;
    const existing = await prisma.documentCategory.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 },
      );
    }

    const category = await prisma.documentCategory.create({
      data: { name, isCustom: true },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("Failed to create category:", err);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
