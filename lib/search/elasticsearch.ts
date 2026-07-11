import { Client } from "@elastic/elasticsearch";
import {
  ISearchService,
  SearchParams,
  SearchResult,
  DocumentSearchParams,
  DocumentSearchResult,
} from "./search";
import { DatabaseSearchService } from "./database";

export class ElasticsearchSearchService implements ISearchService {
  private client: Client;
  private dbFallback = new DatabaseSearchService();

  constructor(url: string) {
    console.log(
      `[Search] Initializing ElasticsearchSearchService at node ${url}`,
    );
    const username = process.env.ELASTICSEARCH_USERNAME;
    const password = process.env.ELASTICSEARCH_PASSWORD;

    this.client = new Client({
      node: url,
      auth: username && password ? { username, password } : undefined,
    });

    // Fire-and-forget index initialization in background
    this.initializeIndex();
  }

  private async initializeIndex() {
    try {
      const exists = await this.client.indices.exists({ index: "employees" });
      if (!exists) {
        await this.client.indices.create({
          index: "employees",
          settings: {
            analysis: {
              analyzer: {
                autocomplete_analyzer: {
                  type: "custom",
                  tokenizer: "autocomplete_tokenizer",
                  filter: ["lowercase"],
                },
              },
              tokenizer: {
                autocomplete_tokenizer: {
                  type: "edge_ngram",
                  min_gram: 2,
                  max_gram: 10,
                  token_chars: ["letter", "digit"],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: "keyword" },
              employeeCode: {
                type: "text",
                analyzer: "autocomplete_analyzer",
                fields: { raw: { type: "keyword" } },
              },
              name: {
                type: "text",
                analyzer: "autocomplete_analyzer",
                fields: { raw: { type: "keyword" } },
              },
              department: {
                type: "text",
                fields: { raw: { type: "keyword" } },
              },
              level: { type: "keyword" },
              country: { type: "keyword" },
              isActive: { type: "boolean" },
              startDate: { type: "date" },
            },
          },
        });
        console.log(
          "[Elasticsearch] Created index 'employees' with custom edge_ngram analyzer.",
        );
      }
    } catch (error) {
      console.error(
        "[Elasticsearch] Connection failed or could not initialize index. Fallback search queries will default to PostgreSQL client-side search logic.",
        error,
      );
    }
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      filters,
      cursor,
      limit = 50,
      sortBy = "name",
      sortOrder = "asc",
    } = params;

    // 1. Build Query Clauses
    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    if (query) {
      const sanitized = query.trim();
      mustClauses.push({
        multi_match: {
          query: sanitized,
          fields: ["name^2", "employeeCode"],
          fuzziness: "AUTO",
          prefix_length: 2,
        },
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // 2. Build Filter Clauses
    if (filters) {
      if (filters.isActive !== undefined) {
        filterClauses.push({ term: { isActive: filters.isActive } });
      }
      if (filters.department) {
        filterClauses.push({ term: { "department.raw": filters.department } });
      }
      if (filters.level) {
        filterClauses.push({ term: { level: filters.level } });
      }
      if (filters.country) {
        filterClauses.push({ term: { country: filters.country } });
      }

      if (filters.startDateMin || filters.startDateMax) {
        const range: any = {};
        if (filters.startDateMin) range.gte = filters.startDateMin;
        if (filters.startDateMax) range.lte = filters.startDateMax;
        filterClauses.push({ range: { startDate: range } });
      }

      if (filters.ids) {
        filterClauses.push({ terms: { id: filters.ids } });
      }
    }

    // 3. Sorting mappings (mapping sortBy fields to indexed keywords)
    const sortConfig: any[] = [];
    if (sortBy === "name") {
      sortConfig.push({ "name.raw": sortOrder });
    } else if (sortBy === "startDate") {
      sortConfig.push({ startDate: sortOrder });
    } else if (sortBy === "employeeCode") {
      sortConfig.push({ "employeeCode.raw": sortOrder });
    } else if (sortBy === "department") {
      sortConfig.push({ "department.raw": sortOrder });
    } else {
      sortConfig.push({ "name.raw": "asc" });
    }
    // Append tie-breaker
    sortConfig.push({ id: "asc" });

    // 4. Cursor decoding (search_after parameters)
    let searchAfter: any[] | undefined = undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(
          Buffer.from(cursor, "base64").toString("utf-8"),
        );
      } catch (err) {
        console.error("[Elasticsearch] Cursor decode failed:", err);
      }
    }

    try {
      // 5. Execute Search
      const esResponse = await this.client.search({
        index: "employees",
        size: limit,
        query: {
          bool: {
            must: mustClauses,
            filter: filterClauses,
          },
        },
        sort: sortConfig,
        search_after: searchAfter,
        highlight: {
          fields: {
            name: {},
            employeeCode: {},
          },
        },
      });

      // 6. Map hits to Employee entities
      const totalHits =
        typeof esResponse.hits.total === "number"
          ? esResponse.hits.total
          : esResponse.hits.total?.value || 0;

      const employees = esResponse.hits.hits.map((hit: any) => {
        const source = hit._source;
        // Merge highlights if present
        let highlightedName = source.name;
        if (hit.highlight?.name?.[0]) {
          highlightedName = hit.highlight.name[0];
        }

        return {
          ...source,
          highlightedName,
        };
      });

      // Calculate next cursor
      let nextCursor: string | null = null;
      if (employees.length === limit && esResponse.hits.hits.length > 0) {
        const lastHit = esResponse.hits.hits[esResponse.hits.hits.length - 1];
        if (lastHit.sort) {
          nextCursor = Buffer.from(JSON.stringify(lastHit.sort)).toString(
            "base64",
          );
        }
      }

      return {
        employees,
        nextCursor,
        totalHits,
      };
    } catch (error) {
      console.error(
        "[Elasticsearch] Search query failed. Falling back to DatabaseSearchService:",
        error,
      );
      return this.dbFallback.search(params);
    }
  }

  async syncIndex(employee: any): Promise<void> {
    try {
      await this.client.index({
        index: "employees",
        id: employee.id,
        document: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          department: employee.department,
          level: employee.level,
          country: employee.country,
          isActive: employee.isActive,
          startDate: employee.startDate,
        },
      });
    } catch (error) {
      console.error(
        `[Elasticsearch] Sync failed for employee ${employee.id}:`,
        error,
      );
      // Fail silently or log error for background sync resiliency
    }
  }

  async deleteFromIndex(employeeId: string): Promise<void> {
    try {
      await this.client.delete({
        index: "employees",
        id: employeeId,
      });
    } catch (error) {
      console.error(
        `[Elasticsearch] Delete failed for employee ${employeeId}:`,
        error,
      );
    }
  }

  async searchDocuments(params: DocumentSearchParams): Promise<DocumentSearchResult> {
    return this.dbFallback.searchDocuments(params);
  }

  async syncDocumentIndex(document: any): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: "documents" });
      if (!exists) {
        await this.client.indices.create({ index: "documents" });
      }

      await this.client.index({
        index: "documents",
        id: document.id,
        document: {
          id: document.id,
          employeeId: document.employeeId,
          fileName: document.fileName,
          originalName: document.originalName,
          description: document.description,
          fileType: document.fileType,
          fileSize: document.fileSize,
          isConfidential: document.isConfidential,
          uploadedBy: document.uploadedBy,
          createdAt: document.createdAt,
        },
      });
    } catch (error) {
      console.error(
        `[Elasticsearch] Document Sync failed for document ${document.id}:`,
        error,
      );
    }
  }

  async deleteDocumentFromIndex(documentId: string): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: "documents" });
      if (exists) {
        await this.client.delete({
          index: "documents",
          id: documentId,
        });
      }
    } catch (error) {
      console.error(
        `[Elasticsearch] Document Delete failed for document ${documentId}:`,
        error,
      );
    }
  }
}
