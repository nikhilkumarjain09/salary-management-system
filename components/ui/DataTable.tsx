import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreVertical,
  ChevronDown,
  Check,
} from "lucide-react";
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
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  // Context menu
  onRowContextMenu?: (e: React.MouseEvent, item: T) => void;
  rowActions?: (item: T) => React.ReactNode;
  // Virtualization
  virtualized?: boolean;
  // Page Size selector
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (item: T) => void;
}

export function PageSizeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-surface border-border text-text-primary hover:bg-surface-hover/80 flex items-center gap-1 cursor-pointer rounded border px-2.5 py-1 text-xs font-semibold"
        type="button"
      >
        <span>Show {value} per page</span>
        <ChevronDown size={12} className="text-text-muted" />
      </button>
      {isOpen && (
        <div className="bg-surface border-border absolute bottom-full mb-1.5 left-0 w-36 rounded border shadow-xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-1 duration-100">
          {[50, 100, 200, 500].map((size) => (
            <button
              key={size}
              onClick={() => {
                onChange(size);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-surface-hover cursor-pointer text-left ${
                value === size
                  ? "text-accent font-bold bg-accent/5"
                  : "text-text-muted hover:text-text-primary"
              }`}
              type="button"
            >
              <span>{size} per page</span>
              {value === size && <Check size={12} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  selectable = false,
  selectedIds,
  onSelectionChange,
  onRowContextMenu,
  rowActions,
  virtualized = false,
  pageSize = 50,
  onPageSizeChange,
  onRowClick,
}: DataTableProps<T>) {
  const handleHeaderClick = (key: string, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  const isAllSelected =
    selectable &&
    data.length > 0 &&
    selectedIds !== undefined &&
    data.every((item) => selectedIds.has(item.id));

  const isSomeSelected =
    selectable &&
    selectedIds !== undefined &&
    data.some((item) => selectedIds.has(item.id)) &&
    !isAllSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (isAllSelected) {
      // Deselect all current page items
      const next = new Set(selectedIds);
      data.forEach((item) => next.delete(item.id));
      onSelectionChange(next);
    } else {
      // Select all current page items
      const next = new Set(selectedIds);
      data.forEach((item) => next.add(item.id));
      onSelectionChange(next);
    }
  };
  const handleSelectRow = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  // Virtualization state & scroll listeners
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  const rowHeight = 56;
  const viewportHeight = 560; // 10 rows

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (virtualized) {
      const nextScroll = e.currentTarget.scrollTop;
      if (
        Math.abs(nextScroll - lastScrollTopRef.current) > 80 ||
        nextScroll === 0 ||
        nextScroll + viewportHeight >= e.currentTarget.scrollHeight - 10
      ) {
        lastScrollTopRef.current = nextScroll;
        setScrollTop(nextScroll);
      }
    }
  };

  // Reset scroll to 0 if data changes or filters apply
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      lastScrollTopRef.current = 0;
      setScrollTop(0);
    }
  }, [data, virtualized]);

  const totalItems = data.length;
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight);
  const buffer = 10;
  const bufferedStartIndex = Math.max(0, startIndex - buffer);
  const bufferedEndIndex = Math.min(totalItems, endIndex + buffer);

  const visibleData = virtualized
    ? data.slice(bufferedStartIndex, bufferedEndIndex)
    : data;

  const topSpacerHeight = virtualized ? bufferedStartIndex * rowHeight : 0;
  const bottomSpacerHeight = virtualized
    ? (totalItems - bufferedEndIndex) * rowHeight
    : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`border-border bg-surface w-full overflow-x-auto rounded-lg border ${
          virtualized ? "max-h-[616px] overflow-y-auto" : ""
        }`}
      >
        <table className="text-text-primary w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border bg-background/50 border-b">
              {selectable && (
                <th className="w-10 px-3 py-4">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="border-border bg-background text-accent focus:ring-accent h-4 w-4 rounded"
                    aria-label="Select all employees on this page"
                  />
                </th>
              )}
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
              {rowActions && (
                <th className="w-10 px-3 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-border/40 border-b"
                  style={{ height: `${rowHeight}px` }}
                >
                  {selectable && (
                    <td className="px-3 py-4">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <Skeleton className="h-4 w-5/6" />
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-3 py-4">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
                  }
                  className="text-text-muted px-6 py-12 text-center"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              <>
                {topSpacerHeight > 0 && (
                  <tr style={{ height: `${topSpacerHeight}px` }}>
                    <td
                      colSpan={
                        columns.length +
                        (selectable ? 1 : 0) +
                        (rowActions ? 1 : 0)
                      }
                    />
                  </tr>
                )}
                {visibleData.map((item, rIdx) => {
                  const globalIndex = virtualized
                    ? bufferedStartIndex + rIdx
                    : rIdx;
                  const isSelected = selectedIds?.has(item.id) ?? false;
                  return (
                    <tr
                      key={item.id || globalIndex}
                      onContextMenu={(e) => {
                        if (onRowContextMenu) {
                          e.preventDefault();
                          onRowContextMenu(e, item);
                        }
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('input[type="checkbox"]') ||
                          target.closest("button")
                        ) {
                          return;
                        }
                        if (onRowClick) {
                          onRowClick(item);
                        }
                      }}
                      className={`border-border/40 hover:bg-surface-hover/50 border-b transition-colors ${
                        isSelected ? "bg-accent/5" : ""
                      } ${onRowClick ? "cursor-pointer" : ""}`}
                      style={{ height: `${rowHeight}px` }}
                    >
                      {selectable && (
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.id)}
                            className="border-border bg-background text-accent focus:ring-accent h-4 w-4 rounded"
                            aria-label={`Select employee`}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className="px-6 py-4">
                          {col.render
                            ? col.render(item)
                            : ((item as Record<string, unknown>)[
                                col.key
                              ] as React.ReactNode)}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="px-3 py-4">{rowActions(item)}</td>
                      )}
                    </tr>
                  );
                })}
                {bottomSpacerHeight > 0 && (
                  <tr style={{ height: `${bottomSpacerHeight}px` }}>
                    <td
                      colSpan={
                        columns.length +
                        (selectable ? 1 : 0) +
                        (rowActions ? 1 : 0)
                      }
                    />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-text-muted flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-semibold text-text-muted/80">
            {totalHits > 0
              ? `Showing ${currentPageIndex * pageSize + 1}-${Math.min(
                  totalHits,
                  currentPageIndex * pageSize + data.length,
                )} of ${totalHits.toLocaleString()} records`
              : `Showing ${data.length} record${data.length !== 1 ? "s" : ""}`}
          </span>
          {onPageSizeChange && (
            <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
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
