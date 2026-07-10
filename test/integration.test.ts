import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  GET as getEmployees,
  POST as createEmployee,
} from "../app/api/employees/route";
import { PATCH as bulkUpdateEmployees } from "../app/api/employees/bulk/route";
import { POST as runPayQuery } from "../app/api/pay-query/route";
import { prisma } from "../lib/prisma";
import { auth } from "../auth";

// Mock the Auth session
vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

// Mock the Prisma Client queries
vi.mock("../lib/prisma", () => {
  const mockPrisma = {
    employee: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salaryRecord: {
      create: vi.fn(),
    },
    auditLogEntry: {
      create: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === "function") {
        return cb(mockPrisma);
      }
      return cb;
    }),
  };
  return { prisma: mockPrisma };
});

describe("Employee API Routes Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GET /api/employees test
  it("should return a list of employees under a valid authenticated session", async () => {
    // 1. Mock valid authenticated session
    (auth as any).mockResolvedValue({
      user: { email: "admin@acme.com" },
    });

    // 2. Mock Prisma database return
    const mockEmployees = [
      {
        id: "1",
        name: "Jane Doe",
        employeeCode: "EMP-001",
        department: "Engineering",
      },
    ];
    (prisma.employee.findMany as any).mockResolvedValue(mockEmployees);
    (prisma.employee.count as any).mockResolvedValue(1);

    // 3. Construct request
    const req = new NextRequest("http://localhost/api/employees?limit=10");

    // 4. Run handler
    const res = await getEmployees(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.employees).toHaveLength(1);
    expect(body.employees[0].name).toBe("Jane Doe");
    expect(prisma.employee.findMany).toHaveBeenCalled();
  });

  it("should block unauthenticated requests returning 401", async () => {
    // 1. Mock unauthenticated session (null)
    (auth as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/employees");
    const res = await getEmployees(req);
    expect(res.status).toBe(401);
  });

  // POST /api/employees (Employee mutation audit trail test)
  it("should verify audit log entry creation on employee creation", async () => {
    (auth as any).mockResolvedValue({
      user: { email: "admin@acme.com" },
    });

    // Mock create returning created employee
    const newEmp = {
      id: "emp-99",
      name: "Jack Smith",
      employeeCode: "EMP-099",
      department: "Marketing",
      level: "L2",
      country: "US",
    };
    (prisma.employee.create as any).mockResolvedValue(newEmp);

    const req = new NextRequest("http://localhost/api/employees", {
      method: "POST",
      body: JSON.stringify({
        name: "Jack Smith",
        employeeCode: "EMP-099",
        department: "Marketing",
        level: "L2",
        country: "US",
        startDate: "2026-01-01",
        initialSalary: 60000,
        currency: "USD",
      }),
    });

    const res = await createEmployee(req);
    expect(res.status).toBe(201);

    // Verify Prisma auditLogEntry.create was executed
    expect(prisma.auditLogEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorLabel: "admin@acme.com",
          action: "CREATE",
          entityType: "EMPLOYEE",
        }),
      }),
    );
  });

  // PATCH /api/employees/bulk
  it("should bulk update multiple employees transactionally and write audit logs", async () => {
    (auth as any).mockResolvedValue({
      user: { email: "admin@acme.com" },
    });

    const mockEmployees = [
      { id: "1", name: "Emp A", department: "Engineering" },
      { id: "2", name: "Emp B", department: "Engineering" },
    ];
    (prisma.employee.findMany as any).mockResolvedValue(mockEmployees);
    (prisma.employee.update as any).mockImplementation(({ data }: any) => ({
      id: "1",
      name: "Emp A",
      ...data,
    }));

    const req = new NextRequest("http://localhost/api/employees/bulk", {
      method: "PATCH",
      body: JSON.stringify({
        ids: ["1", "2"],
        changes: { department: "Sales" },
      }),
    });

    const res = await bulkUpdateEmployees(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.updated).toBe(2);

    // Verify audit logs created for both employees
    expect(prisma.auditLogEntry.create).toHaveBeenCalledTimes(2);
  });
});

describe("Natural Language Query Shape Matching Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should classify natural language query using Groq mock responses", async () => {
    (auth as any).mockResolvedValue({
      user: { email: "admin@acme.com" },
    });

    process.env.GROQ_API_KEY = "mock-groq-key";

    // Mock global.fetch to mock double Groq API pipeline (classification + generation)
    const mockClassificationResult = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              shape: "avg_pay_by_dimension",
              parameters: { dimension: "department" },
            }),
          },
        },
      ],
    };
    const mockGenerationResult = {
      choices: [
        {
          message: {
            content: "The average pay in Engineering is $125,000 USD.",
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassificationResult,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerationResult,
      } as any);

    // Mock database aggregate query response
    const mockDbAvgPay = [{ name: "Engineering", avgPay: 125000 }];
    (prisma.$queryRawUnsafe as any).mockResolvedValue(mockDbAvgPay);

    const req = new NextRequest("http://localhost/api/pay-query", {
      method: "POST",
      body: JSON.stringify({
        question: "What is the average pay in engineering?",
      }),
    });

    const res = await runPayQuery(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.shape).toBe("avg_pay_by_dimension");
    expect(body.answer).toContain("Engineering");
    expect(body.answer).toContain("$125,000");

    fetchSpy.mockRestore();
  });
});
