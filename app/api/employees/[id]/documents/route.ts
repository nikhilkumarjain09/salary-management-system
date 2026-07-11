import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/lib/storage/storage";
import { searchService } from "@/lib/search/search";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/employees/[id]/documents - List employee documents
export async function GET(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: employeeId } = await context.params;
  const user = session.user as any;
  const userRole = user.role || "HR_MANAGER";

  // RBAC Permission Check
  // Employees can only access their own documents
  if (userRole === "EMPLOYEE" && user.employeeId !== employeeId) {
    return NextResponse.json(
      { error: "Forbidden: You can only view your own documents" },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const categoryId = searchParams.get("categoryId") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const expiryStatus =
      (searchParams.get("expiryStatus") as any) || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    // Set filters
    const filters: any = {
      employeeId,
      categoryId,
      tag,
      expiryStatus,
    };

    // Employees cannot see confidential documents
    if (userRole === "EMPLOYEE") {
      filters.isConfidential = false;
    }

    const result = await searchService.searchDocuments({
      query,
      filters,
      cursor,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Fetch documents failed:", err);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 },
    );
  }
}

// POST /api/employees/[id]/documents - Upload document
export async function POST(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: employeeId } = await context.params;
  const user = session.user as any;
  const userRole = user.role || "HR_MANAGER";

  // Only allowed roles can upload
  const allowedRoles = ["HR_ADMIN", "HR_MANAGER"];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges to upload documents" },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const categoryId = formData.get("categoryId") as string | null;
    const description = formData.get("description") as string | null;
    const expiryDateStr = formData.get("expiryDate") as string | null;
    const isConfidentialStr = formData.get("isConfidential") as string | null;
    const tagsStr = formData.get("tags") as string | null; // Comma-separated tags

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 },
      );
    }

    // 25MB File size limit check
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 25MB maximum limit." },
        { status: 400 },
      );
    }

    // Upload file buffer using abstraction
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await storageService.uploadFile(
      buffer,
      file.name,
      file.type,
    );

    const isConfidential = isConfidentialStr === "true";
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;

    // Process tags
    const tagNames = tagsStr
      ? tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    const createdDocument = await prisma.$transaction(async (tx) => {
      // Upsert tags
      const tagConnects = [];
      for (const tagName of tagNames) {
        const tag = await tx.documentTag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        tagConnects.push({ id: tag.id });
      }

      // Create Document in Database
      const doc = await tx.document.create({
        data: {
          employeeId,
          fileName: file.name,
          originalName: file.name,
          categoryId,
          description,
          fileType: file.name.split(".").pop() || "unknown",
          fileSize: file.size,
          uploadedBy: user.email,
          storageProvider: process.env.STORAGE_PROVIDER || "local",
          storagePath: uploadResult.storagePath,
          downloadUrl: uploadResult.downloadUrl,
          previewUrl: uploadResult.previewUrl || uploadResult.downloadUrl,
          expiryDate,
          isConfidential,
          tags: {
            connect: tagConnects,
          },
        },
        include: {
          category: true,
          tags: true,
        },
      });

      // Write Audit log
      await tx.auditLogEntry.create({
        data: {
          actorLabel: user.email || "System",
          action: "DOCUMENT_UPLOAD",
          entityType: "DOCUMENT",
          entityId: doc.id,
          afterValue: doc as any,
        },
      });

      return doc;
    });

    // Background sync to Elasticsearch / Search Service
    await searchService.syncDocumentIndex(createdDocument);

    return NextResponse.json(createdDocument, { status: 201 });
  } catch (error: any) {
    console.error("Upload Document API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 },
    );
  }
}
