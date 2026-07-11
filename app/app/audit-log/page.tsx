"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  FilterX,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Users,
  UserX,
  ArrowLeftRight,
  FileSpreadsheet,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageSizeSelector } from "@/components/ui/DataTable";
import { CustomSelect } from "@/components/ui/CustomSelect";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface AuditEntry {
  id: string;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  createdAt: string;
}

interface FilterMeta {
  entityTypes: string[];
  actions: string[];
}

/* ------------------------------------------------------------------ */
/*  Human-readable helpers                                            */
/* ------------------------------------------------------------------ */

function actionIcon(action: string) {
  switch (action) {
    case "CREATE":
      return <Plus size={14} className="text-emerald-500" />;
    case "UPDATE":
      return <Pencil size={14} className="text-accent" />;
    case "BULK_UPDATE":
      return <Users size={14} className="text-amber-500" />;
    case "DEACTIVATE":
      return <UserX size={14} className="text-destructive" />;
    default:
      return <ArrowLeftRight size={14} className="text-text-muted" />;
  }
}

function actionLabel(action: string) {
  switch (action) {
    case "CREATE":
      return "Created";
    case "UPDATE":
      return "Updated";
    case "BULK_UPDATE":
      return "Bulk updated";
    case "DEACTIVATE":
      return "Deactivated";
    default:
      return action.charAt(0) + action.slice(1).toLowerCase();
  }
}

function humanDescription(entry: AuditEntry): string {
  const verb = actionLabel(entry.action);
  const type = entry.entityType.toLowerCase();

  // Try to extract a name from the after or before value
  const name =
    (entry.afterValue?.name as string) ||
    (entry.beforeValue?.name as string) ||
    "";
  const code =
    (entry.afterValue?.employeeCode as string) ||
    (entry.beforeValue?.employeeCode as string) ||
    "";

  if (name) {
    return `${verb} ${type} ${name}${code ? ` (${code})` : ""}`;
  }

  return `${verb} ${type} ${entry.entityId.slice(0, 8)}...`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Diff viewer                                                       */
/* ------------------------------------------------------------------ */

function DiffViewer({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  if (!before && !after) {
    return (
      <p className="text-text-muted py-2 text-xs italic">
        No data recorded for this entry.
      </p>
    );
  }

  // Collect all unique keys across both objects
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  // Filter to only changed keys (or all if one side is null)
  const changedKeys: string[] = [];
  const unchangedKeys: string[] = [];

  for (const key of allKeys) {
    // Skip internal/noisy fields
    if (key === "id" || key === "createdAt" || key === "updatedAt") continue;

    const bVal = before ? before[key] : undefined;
    const aVal = after ? after[key] : undefined;

    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      changedKeys.push(key);
    } else {
      unchangedKeys.push(key);
    }
  }

  if (!before) {
    // Pure creation — show all after values
    return (
      <div className="space-y-1">
        <p className="text-text-muted mb-2 text-xs font-semibold uppercase">
          Created with values:
        </p>
        {Object.entries(after || {})
          .filter(([k]) => k !== "id" && k !== "createdAt" && k !== "updatedAt")
          .map(([key, val]) => (
            <div key={key} className="flex items-baseline gap-2 text-xs">
              <span className="text-text-muted w-32 shrink-0 text-right font-medium">
                {key}:
              </span>
              <span className="font-mono text-emerald-400">
                {formatValue(val)}
              </span>
            </div>
          ))}
      </div>
    );
  }

  if (changedKeys.length === 0) {
    return (
      <p className="text-text-muted py-2 text-xs italic">
        No field changes detected in this entry.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-text-muted mb-2 text-xs font-semibold uppercase">
        Changed fields:
      </p>
      {changedKeys.map((key) => {
        const bVal = before ? before[key] : undefined;
        const aVal = after
          ? (after as Record<string, unknown>)[key]
          : undefined;
        return (
          <div key={key} className="flex items-baseline gap-2 text-xs">
            <span className="text-text-muted w-32 shrink-0 text-right font-medium">
              {key}:
            </span>
            <span className="font-mono text-rose-400 line-through">
              {formatValue(bVal)}
            </span>
            <span className="text-text-muted">-&gt;</span>
            <span className="font-mono text-emerald-400">
              {formatValue(aVal)}
            </span>
          </div>
        );
      })}
      {unchangedKeys.length > 0 && (
        <p className="text-text-muted mt-2 text-xs">
          {unchangedKeys.length} unchanged field
          {unchangedKeys.length !== 1 ? "s" : ""} hidden.
        </p>
      )}
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/* ------------------------------------------------------------------ */
/*  Action badge                                                      */
/* ------------------------------------------------------------------ */

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CREATE: "bg-emerald-500/10 text-emerald-500",
    UPDATE: "bg-accent/10 text-accent",
    BULK_UPDATE: "bg-amber-500/10 text-amber-500",
    DEACTIVATE: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${colors[action] || "bg-surface-hover text-text-muted"}`}
    >
      {actionIcon(action)}
      {action}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalHits, setTotalHits] = useState(0);

  // Filters
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filter metadata
  const [meta, setMeta] = useState<FilterMeta>({
    entityTypes: [],
    actions: [],
  });

  // Pagination
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Virtualization state & scroll listeners
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  const rowHeight = 56;
  const viewportHeight = 560; // 10 rows

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const nextScroll = e.currentTarget.scrollTop;
    if (
      Math.abs(nextScroll - lastScrollTopRef.current) > 80 ||
      nextScroll === 0 ||
      nextScroll + viewportHeight >= e.currentTarget.scrollHeight - 10
    ) {
      lastScrollTopRef.current = nextScroll;
      setScrollTop(nextScroll);
    }
  };

  // Reset scroll to 0 if data changes or filters apply
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      lastScrollTopRef.current = 0;
      setScrollTop(0);
    }
  }, [entries]);

  const totalItems = entries.length;
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = Math.ceil((scrollTop + viewportHeight) / rowHeight);
  const buffer = 10;
  const bufferedStartIndex = Math.max(0, startIndex - buffer);
  const bufferedEndIndex = Math.min(totalItems, endIndex + buffer);

  const visibleEntries = entries.slice(bufferedStartIndex, bufferedEndIndex);

  const topSpacerHeight = bufferedStartIndex * rowHeight;
  const bottomSpacerHeight = (totalItems - bufferedEndIndex) * rowHeight;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCursorHistory([null]);
    setCurrentPageIndex(0);
  }, [entityType, action, dateFrom, dateTo, limit]);

  // Fetch metadata on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch("/api/audit-log?metadata=true");
        if (res.ok) {
          const data = await res.json();
          setMeta(data);
        }
      } catch (err) {
        console.error("Error loading audit metadata:", err);
      }
    };
    fetchMeta();
  }, []);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeCursor = cursorHistory[currentPageIndex];
      let url = `/api/audit-log?limit=${limit}`;

      if (entityType) url += `&entityType=${encodeURIComponent(entityType)}`;
      if (action) url += `&action=${encodeURIComponent(action)}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      if (activeCursor) url += `&cursor=${activeCursor}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setNextCursor(data.nextCursor);
        setTotalHits(data.totalHits);
      }
    } catch (err) {
      console.error("Error fetching audit log:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    entityType,
    action,
    dateFrom,
    dateTo,
    currentPageIndex,
    cursorHistory,
    limit,
  ]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorHistory((prev) => [...prev, nextCursor]);
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const handleClearFilters = () => {
    setEntityType("");
    setAction("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-12">
      <PageHeader
        title="Audit Log"
        description="Immutable record of every mutation across the system."
        actions={
          <div className="text-text-muted flex items-center gap-2 text-sm">
            <FileText size={16} />
            <span>{totalHits} total entries</span>
          </div>
        }
      />

      <main className="space-y-6">
        {/* Filters */}
        <Card className="border-border bg-surface p-4">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-5">
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Entity Type
              </label>
              <CustomSelect
                value={entityType}
                onChange={setEntityType}
                options={[
                  { value: "", label: "All Types", icon: <FileSpreadsheet size={14} className="text-text-muted/60" /> },
                  ...meta.entityTypes.map((t) => ({
                    value: t,
                    label: t,
                    icon: <FileSpreadsheet size={14} className="text-text-muted/80" />,
                  })),
                ]}
                placeholder="All Types"
                icon={<FileSpreadsheet size={14} className="text-text-muted/60" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Action
              </label>
              <CustomSelect
                value={action}
                onChange={setAction}
                options={[
                  { value: "", label: "All Actions", icon: <Activity size={14} className="text-text-muted/60" /> },
                  ...meta.actions.map((a) => ({
                    value: a,
                    label: a,
                    icon: <Activity size={14} className="text-text-muted/80" />,
                  })),
                ]}
                placeholder="All Actions"
                icon={<Activity size={14} className="text-text-muted/60" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              />
            </div>

            <Button
              variant="outline"
              className="hover:bg-surface-hover border-border border px-2.5 py-2"
              onClick={handleClearFilters}
              title="Clear Filters"
            >
              <FilterX size={16} className="mr-1.5" />
              Clear
            </Button>
          </div>
        </Card>

        {/* Audit Table */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="border-border bg-surface w-full overflow-x-auto overflow-y-auto rounded-lg border max-h-[616px]"
        >
          <table className="text-text-primary w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-border bg-background/50 border-b">
                <th className="w-8 px-3 py-4" />
                <th className="text-text-muted px-6 py-4 text-xs font-semibold tracking-wider uppercase">
                  Timestamp
                </th>
                <th className="text-text-muted px-6 py-4 text-xs font-semibold tracking-wider uppercase">
                  Action
                </th>
                <th className="text-text-muted px-6 py-4 text-xs font-semibold tracking-wider uppercase">
                  Description
                </th>
                <th className="text-text-muted px-6 py-4 text-xs font-semibold tracking-wider uppercase">
                  Actor
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-border/40 border-b">
                    <td className="px-3 py-4">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-text-muted px-6 py-12 text-center"
                  >
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                <>
                  {topSpacerHeight > 0 && (
                    <tr style={{ height: `${topSpacerHeight}px` }}>
                      <td colSpan={5} />
                    </tr>
                  )}
                  {visibleEntries.map((entry) => {
                    const isExpanded = expandedIds.has(entry.id);
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          onClick={() => toggleExpanded(entry.id)}
                          className="border-border/40 hover:bg-surface-hover/50 cursor-pointer border-b transition-colors"
                          style={{ height: `${rowHeight}px` }}
                        >
                          <td className="px-3 py-4">
                            {isExpanded ? (
                              <ChevronDown
                                size={14}
                                className="text-text-muted"
                              />
                            ) : (
                              <ChevronRight
                                size={14}
                                className="text-text-muted"
                              />
                            )}
                          </td>
                          <td className="text-text-muted px-6 py-4 text-xs">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <ActionBadge action={entry.action} />
                          </td>
                          <td className="text-text-primary px-6 py-4 text-sm font-medium">
                            {humanDescription(entry)}
                          </td>
                          <td className="text-text-muted px-6 py-4 text-xs">
                            {entry.actorLabel}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-border/40 border-b">
                            <td />
                            <td
                              colSpan={4}
                              className="bg-background/30 px-6 py-4"
                            >
                              <DiffViewer
                                before={entry.beforeValue}
                                after={entry.afterValue}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {bottomSpacerHeight > 0 && (
                    <tr style={{ height: `${bottomSpacerHeight}px` }}>
                      <td colSpan={5} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="text-text-muted flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-text-muted/80">
              {totalHits > 0
                ? `Showing ${currentPageIndex * limit + 1}-${Math.min(
                    totalHits,
                    currentPageIndex * limit + entries.length,
                  )} of ${totalHits.toLocaleString()} records`
                : `Showing ${entries.length} record${entries.length !== 1 ? "s" : ""}`}
            </span>
            <PageSizeSelector value={limit} onChange={setLimit} />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevPage}
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
              onClick={handleNextPage}
              disabled={!nextCursor || isLoading}
              className="bg-surface border-border text-text-primary hover:bg-surface-hover rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
