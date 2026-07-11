import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/lib/storage/storage";
import { searchService } from "@/lib/search/search";

type RouteContext = {
  params: Promise<{ id: string; docId: string }>;
};

// PATCH /api/employees/[id]/documents/[docId] - Update metadata
export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const user = session.user as any;
  const userRole = user.role || "HR_MANAGER";

  // Role permissions check
  const allowedRoles = ["HR_ADMIN", "HR_MANAGER"];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges to update documents" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const {
      fileName,
      description,
      categoryId,
      isConfidential,
      expiryDate,
      tags,
    } = body;

    const existing = await prisma.document.findUnique({
      where: { id: docId },
      include: { tags: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const updatedDocument = await prisma.$transaction(async (tx) => {
      // Connect new tags
      const tagConnects = [];
      if (tags && Array.isArray(tags)) {
        // Disconnect old tags first
        await tx.document.update({
          where: { id: docId },
          data: {
            tags: {
              disconnect: existing.tags.map((t) => ({ id: t.id })),
            },
          },
        });

        for (const tagName of tags) {
          const cleanTagName = tagName.trim();
          if (cleanTagName) {
            const tag = await tx.documentTag.upsert({
              where: { name: cleanTagName },
              update: {},
              create: { name: cleanTagName },
            });
            tagConnects.push({ id: tag.id });
          }
        }
      }

      // Update Document metadata
      const doc = await tx.document.update({
        where: { id: docId },
        data: {
          fileName: fileName || undefined,
          description: description !== undefined ? description : undefined,
          categoryId: categoryId || undefined,
          isConfidential:
            isConfidential !== undefined ? isConfidential : undefined,
          expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
          tags: tags ? { connect: tagConnects } : undefined,
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
          action: "DOCUMENT_METADATA_UPDATE",
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

    return NextResponse.json(updatedDocument);
  } catch (error: any) {
    console.error("Update Document API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update document" },
      { status: 500 },
    );
  }
}

// DELETE /api/employees/[id]/documents/[docId] - Delete document
export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await context.params;
  const user = session.user as any;
  const userRole = user.role || "HR_MANAGER";

  // Role permissions check
  const allowedRoles = ["HR_ADMIN", "HR_MANAGER"];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges to delete documents" },
      { status: 403 },
    );
  }

  try {
    const existing = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Delete file from storage provider first
    await storageService.deleteFile(existing.storagePath);

    // Delete record from Database inside transaction
    await prisma.$transaction(async (tx) => {
      // Create audit log first
      await tx.auditLogEntry.create({
        data: {
          actorLabel: user.email || "System",
          action: "DOCUMENT_DELETE",
          entityType: "DOCUMENT",
          entityId: docId,
          beforeValue: existing as any,
        },
      });

      await tx.document.delete({
        where: { id: docId },
      });
    });

    // Remove from search index
    await searchService.deleteDocumentFromIndex(docId);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Document API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete document" },
      { status: 500 },
    );
  }
}
