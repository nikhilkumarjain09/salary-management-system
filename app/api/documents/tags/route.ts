import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tags = await prisma.documentTag.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags);
  } catch (err) {
    console.error("Failed to load tags:", err);
    return NextResponse.json({ error: "Failed to load tags" }, { status: 500 });
  }
}
