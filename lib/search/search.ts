import { DatabaseSearchService } from "./database";
import { ElasticsearchSearchService } from "./elasticsearch";

export interface SearchParams {
  query: string;
  filters?: {
    department?: string;
    level?: string;
    country?: string;
    isActive?: boolean;
    startDateMin?: string;
    startDateMax?: string;
  };
  cursor?: string; // Pagination cursor
  limit?: number; // Items per page
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchResult {
  employees: any[];
  nextCursor: string | null;
  totalHits: number;
}

export interface ISearchService {
  search(params: SearchParams): Promise<SearchResult>;
  syncIndex(employee: any): Promise<void>;
  deleteFromIndex(employeeId: string): Promise<void>;
}

const esUrl = process.env.ELASTICSEARCH_URL;

export const searchService: ISearchService = esUrl
  ? new ElasticsearchSearchService(esUrl)
  : new DatabaseSearchService();
