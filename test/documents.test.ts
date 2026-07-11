import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as getDocuments, POST as uploadDocument } from "../app/api/employees/[id]/documents/route";
import { prisma } from "../lib/prisma";
import { auth } from "../auth";
import { storageService } from "../lib/storage/storage";

// Mock auth
vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

// Mock storage
vi.mock("../lib/storage/storage", () => ({
  storageService: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

// Mock prisma queries
vi.mock("../lib/prisma", () => {
  const mockPrisma = {
    document: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    documentTag: {
      upsert: vi.fn(),
    },
    auditLogEntry: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Document API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should block unauthenticated document listing", async () => {
    (auth as any).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3000/api/employees/emp-123/documents");
    const res = await getDocuments(req, { params: Promise.resolve({ id: "emp-123" }) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should restrict Employees from viewing other employees documents", async () => {
    (auth as any).mockResolvedValueOnce({
      user: {
        email: "employee@acme.com",
        role: "EMPLOYEE",
        employeeId: "emp-123",
      },
    });

    const req = new NextRequest("http://localhost:3000/api/employees/emp-456/documents");
    const res = await getDocuments(req, { params: Promise.resolve({ id: "emp-456" }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  it("should block document upload for non-HR roles", async () => {
    (auth as any).mockResolvedValueOnce({
      user: {
        email: "employee@acme.com",
        role: "EMPLOYEE",
        employeeId: "emp-123",
      },
    });

    const req = new NextRequest("http://localhost:3000/api/employees/emp-123/documents", {
      method: "POST",
    });
    const res = await uploadDocument(req, { params: Promise.resolve({ id: "emp-123" }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });
});
