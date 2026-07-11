import { prisma } from "../prisma";
import {
  ISearchService,
  SearchParams,
  SearchResult,
  DocumentSearchParams,
  DocumentSearchResult,
} from "./search";
import { Prisma } from "@prisma/client";

export class DatabaseSearchService implements ISearchService {
  async search(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      filters,
      cursor,
      limit = 50,
      sortBy = "name",
      sortOrder = "asc",
    } = params;

    const where: Prisma.EmployeeWhereInput = {};

    // 1. Prefix search on name or employeeCode using B-Tree indexes
    if (query) {
      const sanitized = query.trim();
      where.OR = [
        { name: { startsWith: sanitized } },
        { employeeCode: { startsWith: sanitized } },
      ];
    }

    // 2. Advanced filtering using composite index @@index([isActive, department, level, country])
    if (filters) {
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.department) where.department = filters.department;
      if (filters.level) where.level = filters.level;
      if (filters.country) where.country = filters.country;

      if (filters.startDateMin || filters.startDateMax) {
        where.startDate = {};
        if (filters.startDateMin) {
          where.startDate.gte = new Date(filters.startDateMin);
        }
        if (filters.startDateMax) {
          where.startDate.lte = new Date(filters.startDateMax);
        }
      }

      if (filters.ids) {
        where.id = { in: filters.ids };
      }
    }

    // 3. Query execute using only required columns (SELECT projection)
    // Fetch limit + 1 to find out if there's a next page
    const take = limit + 1;

    // Sorting maps
    const orderByList: any[] = [];
    if (sortBy === "name") {
      orderByList.push({ name: sortOrder });
    } else if (sortBy === "startDate") {
      orderByList.push({ startDate: sortOrder });
    } else if (sortBy === "employeeCode") {
      orderByList.push({ employeeCode: sortOrder });
    } else if (sortBy === "department") {
      orderByList.push({ department: sortOrder });
    } else {
      orderByList.push({ name: "asc" });
    }
    // Always append id as tie-breaker for deterministic sorting
    orderByList.push({ id: "asc" });

    // Execute query
    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        level: true,
        country: true,
        isActive: true,
        startDate: true,
      },
      orderBy: orderByList,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined, // Skip the cursor element itself
    });

    // 4. Calculate pagination metadata
    let nextCursor: string | null = null;
    const hasNextPage = employees.length > limit;

    if (hasNextPage) {
      const lastItem = employees[limit - 1];
      nextCursor = lastItem.id;
      // Truncate the extra item
      employees.pop();
    }

    // Count total hits (efficiently indexed)
    const totalHits = await prisma.employee.count({ where });

    return {
      employees,
      nextCursor,
      totalHits,
    };
  }

  async syncIndex(): Promise<void> {
    // Database search is the source of truth, no sync required.
    return Promise.resolve();
  }

  async deleteFromIndex(): Promise<void> {
    return Promise.resolve();
  }

  async searchDocuments(params: DocumentSearchParams): Promise<DocumentSearchResult> {
    const {
      query,
      filters,
      cursor,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const where: Prisma.DocumentWhereInput = {};

    if (query) {
      const sanitized = query.trim();
      where.OR = [
        { fileName: { contains: sanitized, mode: "insensitive" } },
        { originalName: { contains: sanitized, mode: "insensitive" } },
        { description: { contains: sanitized, mode: "insensitive" } },
      ];
    }

    if (filters) {
      if (filters.employeeId) {
        where.employeeId = filters.employeeId;
      }
      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }
      if (filters.isConfidential !== undefined) {
        where.isConfidential = filters.isConfidential;
      }
      if (filters.tag) {
        where.tags = {
          some: {
            name: { equals: filters.tag, mode: "insensitive" },
          },
        };
      }
      if (filters.expiryStatus) {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        if (filters.expiryStatus === "expired") {
          where.expiryDate = { lt: now };
        } else if (filters.expiryStatus === "expiring_soon") {
          where.expiryDate = {
            gte: now,
            lte: thirtyDaysFromNow,
          };
        } else if (filters.expiryStatus === "valid") {
          where.OR = [
            { expiryDate: { gt: thirtyDaysFromNow } },
            { expiryDate: null },
          ];
        }
      }
    }

    const take = limit + 1;
    const orderByList: any[] = [];
    orderByList.push({ [sortBy]: sortOrder });

    const documents = await prisma.document.findMany({
      where,
      include: {
        category: true,
        tags: true,
      },
      orderBy: orderByList,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
    });

    let nextCursor: string | null = null;
    const hasNextPage = documents.length > limit;

    if (hasNextPage) {
      const lastItem = documents[limit - 1];
      nextCursor = lastItem.id;
      documents.pop();
    }

    const totalHits = await prisma.document.count({ where });

    return {
      documents,
      nextCursor,
      totalHits,
    };
  }

  async syncDocumentIndex(): Promise<void> {
    return Promise.resolve();
  }

  async deleteDocumentFromIndex(): Promise<void> {
    return Promise.resolve();
  }
}
