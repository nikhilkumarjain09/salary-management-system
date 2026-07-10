import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Skeleton } from "./Skeleton";

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  nextCursor?: string | null;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  currentPageIndex?: number;
  totalHits?: number;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
  sortBy,
  sortOrder,
  onSort,
  nextCursor,
  onNextPage,
  onPrevPage,
  currentPageIndex = 0,
  totalHits = 0,
  className = "",
}: DataTableProps<T>) {
  const handleHeaderClick = (key: string, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-border bg-surface w-full overflow-x-auto rounded-lg border">
        <table className="text-text-primary w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border bg-background/50 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key, col.sortable)}
                  className={`text-text-muted px-6 py-4 text-xs font-semibold tracking-wider uppercase ${
                    col.sortable
                      ? "hover:text-text-primary cursor-pointer select-none"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable && onSort && (
                      <span className="text-text-muted/65">
                        {sortBy === col.key ? (
                          sortOrder === "asc" ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-border/40 border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <Skeleton className="h-4 w-5/6" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-text-muted px-6 py-12 text-center"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              data.map((item, rIdx) => (
                <tr
                  key={item.id || rIdx}
                  className="border-border/40 hover:bg-surface-hover/50 border-b transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-text-muted flex items-center justify-between px-2 text-sm">
        <div>
          {totalHits > 0 && (
            <span>
              Total records:{" "}
              <strong className="text-text-primary">{totalHits}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onPrevPage}
            disabled={currentPageIndex === 0 || isLoading}
            className="bg-surface border-border text-text-primary hover:bg-surface-hover rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs">
            Page{" "}
            <strong className="text-text-primary">
              {currentPageIndex + 1}
            </strong>
          </span>
          <button
            onClick={onNextPage}
            disabled={!nextCursor || isLoading}
            className="bg-surface border-border text-text-primary hover:bg-surface-hover rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
