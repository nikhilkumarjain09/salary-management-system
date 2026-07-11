import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as bulkImport } from "../app/api/employees/bulk-import/route";
import { auth } from "../auth";
import { prisma } from "../lib/prisma";

vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../lib/prisma", () => {
  const mockPrisma = {
    employee: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    salaryRecord: {
      create: vi.fn(),
    },
    auditLogEntry: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Bulk Import API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should block unauthenticated sessions", async () => {
    (auth as any).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3000/api/employees/bulk-import", {
      method: "POST",
      body: JSON.stringify([]),
    });

    const res = await bulkImport(req);
    expect(res.status).toBe(401);
  });

  it("should restrict standard employees from importing bulk employees", async () => {
    (auth as any).mockResolvedValueOnce({
      user: {
        email: "employee@acme.com",
        role: "EMPLOYEE",
        employeeId: "emp-123",
      },
    });

    const req = new NextRequest("http://localhost:3000/api/employees/bulk-import", {
      method: "POST",
      body: JSON.stringify([]),
    });

    const res = await bulkImport(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  it("should return 400 on invalid payload schema mapping", async () => {
    (auth as any).mockResolvedValueOnce({
      user: {
        email: "hr@acme.com",
        role: "HR_MANAGER",
      },
    });

    const req = new NextRequest("http://localhost:3000/api/employees/bulk-import", {
      method: "POST",
      body: JSON.stringify([{ name: "", employeeCode: "E" }]), // invalid inputs
    });

    const res = await bulkImport(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Validation failed");
  });
});
