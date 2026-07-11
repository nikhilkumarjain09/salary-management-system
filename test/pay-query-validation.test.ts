import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as payQuery } from "../app/api/pay-query/route";
import { auth } from "../auth";

vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

describe("Pay Query SQL Injection Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = "mock-groq-key";
  });

  it("should return 400 if classification returns an unauthorized dimension", async () => {
    // 1. Mock valid authenticated session
    (auth as any).mockResolvedValue({
      user: { email: "admin@acme.com" },
    });

    // 2. Mock Groq API classification output
    const mockClassificationResult = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              shape: "avg_pay_by_dimension",
              parameters: {
                dimension: "department\"; DROP TABLE \"Employee\"; --",
                filterValue: "Engineering",
              },
            }),
          },
        },
      ],
    };

    // Mock fetch globally
    const globalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          json: async () => mockClassificationResult,
        } as any;
      }
      return { ok: false } as any;
    });

    // 3. Dispatch POST request
    const req = new NextRequest("http://localhost/api/pay-query", {
      method: "POST",
      body: JSON.stringify({ question: "Show average pay by department" }),
    });

    const res = await payQuery(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Invalid query dimension");

    // Restore fetch
    global.fetch = globalFetch;
  });
});
