import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSearchService } from "../lib/search/database";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => {
  const mockPrisma = {
    employee: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  };
  return { prisma: mockPrisma };
});

describe("DatabaseSearchService exactMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query using startsWith when exactMatch is not set", async () => {
    const service = new DatabaseSearchService();
    await service.search({
      query: "John",
      filters: {},
    });

    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { startsWith: "John", mode: "insensitive" } },
            { employeeCode: { startsWith: "John", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("should query using equals when exactMatch is true", async () => {
    const service = new DatabaseSearchService();
    await service.search({
      query: "John",
      filters: { exactMatch: true },
    });

    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { equals: "John", mode: "insensitive" } },
            { employeeCode: { equals: "John", mode: "insensitive" } },
          ],
        }),
      })
    );
  });
});
