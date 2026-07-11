import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/lib/storage/storage";
import { searchService } from "@/lib/search/search";

type RouteContext = {
  params: Promise<{ id: string; docId: string }>;
};

// POST /api/employees/[id]/documents/[docId]/versions - Upload a new version
export async function POST(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const user = session.user as any;

  // Role permissions check
  const allowedRoles = ["HR_ADMIN", "HR_MANAGER"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges to upload versions" },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 25MB File size limit check
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 25MB maximum limit." },
        { status: 400 },
      );
    }

    const existing = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Upload new version to storage provider
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await storageService.uploadFile(
      buffer,
      file.name,
      file.type,
    );

    const updatedDocument = await prisma.$transaction(async (tx) => {
      // 1. Create DocumentVersion record archiving the current/old version
      await tx.documentVersion.create({
        data: {
          documentId: existing.id,
          versionNumber: existing.version,
          fileName: existing.fileName,
          fileSize: existing.fileSize,
          storagePath: existing.storagePath,
          downloadUrl: existing.downloadUrl,
          uploadedBy: existing.uploadedBy,
        },
      });

      // 2. Update the main Document record with the new version details
      const doc = await tx.document.update({
        where: { id: docId },
        data: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.name.split(".").pop() || "unknown",
          storageProvider: process.env.STORAGE_PROVIDER || "local",
          storagePath: uploadResult.storagePath,
          downloadUrl: uploadResult.downloadUrl,
          previewUrl: uploadResult.previewUrl || uploadResult.downloadUrl,
          version: existing.version + 1,
          uploadedBy: user.email,
        },
        include: {
          category: true,
          tags: true,
          versions: {
            orderBy: { versionNumber: "desc" },
          },
        },
      });

      // 3. Write Audit log
      await tx.auditLogEntry.create({
        data: {
          actorLabel: user.email || "System",
          action: "DOCUMENT_VERSION_UPLOAD",
          entityType: "DOCUMENT",
          entityId: docId,
          beforeValue: existing as any,
          afterValue: doc as any,
        },
      });

      return doc;
    });

    // Re-sync index
    await searchService.syncDocumentIndex(updatedDocument);

    return NextResponse.json(updatedDocument, { status: 201 });
  } catch (error: any) {
    console.error("Upload Version API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload new document version" },
      { status: 500 },
    );
  }
}
