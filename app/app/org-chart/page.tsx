"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  User,
  Users,
  Search,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface OrgEmployee {
  id: string;
  name: string;
  department: string;
  level: string;
  hasReports: boolean;
  reportsCount: number;
}

export default function OrgChartPage() {
  const [rootEmployees, setRootEmployees] = useState<OrgEmployee[]>([]);
  const [isLoadingRoot, setIsLoadingRoot] = useState(true);

  // Maps to store child nodes by parent managerId
  const [childMap, setChildMap] = useState<Record<string, OrgEmployee[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Node expansion states
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Search/Highlight states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Load child nodes for a manager
  const loadChildren = useCallback(
    async (managerId: string) => {
      if (childMap[managerId] || loadingMap[managerId]) return;

      setLoadingMap((prev) => ({ ...prev, [managerId]: true }));
      try {
        const res = await fetch(`/api/org-chart?managerId=${managerId}`);
        if (res.ok) {
          const data = await res.json();
          setChildMap((prev) => ({ ...prev, [managerId]: data.employees }));
        }
      } catch (err) {
        console.error("Error loading reports:", err);
      } finally {
        setLoadingMap((prev) => ({ ...prev, [managerId]: false }));
      }
    },
    [childMap, loadingMap],
  );

  // Fetch initial top-level managers
  useEffect(() => {
    const fetchRoots = async () => {
      setIsLoadingRoot(true);
      try {
        const res = await fetch("/api/org-chart?managerId=root");
        if (res.ok) {
          const data = await res.json();
          setRootEmployees(data.employees);

          // Pre-load second level (level 2) automatically
          const initialExpanded = new Set<string>();
          for (const emp of data.employees) {
            if (emp.hasReports) {
              initialExpanded.add(emp.id);
              // Fetch children immediately in background
              fetch(`/api/org-chart?managerId=${emp.id}`)
                .then((r) => r.json())
                .then((d) => {
                  setChildMap((prev) => ({ ...prev, [emp.id]: d.employees }));
                });
            }
          }
          setExpandedIds(initialExpanded);
        }
      } catch (err) {
        console.error("Error fetching root nodes:", err);
      } finally {
        setIsLoadingRoot(false);
      }
    };
    fetchRoots();
  }, []);

  // Handle expansion toggle click
  const handleToggle = async (empId: string) => {
    const nextExpanded = new Set(expandedIds);
    if (nextExpanded.has(empId)) {
      nextExpanded.delete(empId);
      setExpandedIds(nextExpanded);
    } else {
      nextExpanded.add(empId);
      setExpandedIds(nextExpanded);
      // Trigger lazy-load if not fetched yet
      if (!childMap[empId]) {
        await loadChildren(empId);
      }
    }
  };

  // Perform search and highlight path traversal
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `/api/org-chart?search=${encodeURIComponent(searchQuery.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.path && data.path.length > 0) {
          const pathIds = data.path as string[];
          const targetId = pathIds[pathIds.length - 1];

          // Expand all managers along the chain path
          const managerIds = pathIds.slice(0, -1);
          setExpandedIds((prev) => {
            const next = new Set(prev);
            managerIds.forEach((id) => next.add(id));
            return next;
          });

          // Fetch all nodes along the path sequentially if missing
          for (const mgrId of managerIds) {
            if (!childMap[mgrId]) {
              const r = await fetch(`/api/org-chart?managerId=${mgrId}`);
              if (r.ok) {
                const d = await r.json();
                setChildMap((prev) => ({ ...prev, [mgrId]: d.employees }));
              }
            }
          }

          // Highlight target node
          setHighlightedId(targetId);

          // Scroll target element into viewport after DOM render
          setTimeout(() => {
            const element = document.getElementById(`org-node-${targetId}`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 300);
        } else {
          setSearchError("No active employee matches query.");
        }
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchError("An unexpected error occurred.");
    } finally {
      setIsSearching(false);
    }
  };

  // Recursive Tree Node Renderer Component
  const renderTreeNode = (emp: OrgEmployee, depth: number = 0) => {
    const isExpanded = expandedIds.has(emp.id);
    const children = childMap[emp.id] || [];
    const isNodeLoading = loadingMap[emp.id] || false;
    const isHighlighted = highlightedId === emp.id;

    return (
      <div key={emp.id} className="relative mt-3">
        {/* Connection line styles */}
        {depth > 0 && (
          <div className="border-border/40 pointer-events-none absolute top-5 -left-[16px] w-[16px] border-t sm:-left-[20px] sm:w-[20px]" />
        )}

        {/* Node card */}
        <div
          id={`org-node-${emp.id}`}
          className={`bg-surface flex max-w-xs items-center gap-2 rounded-xl border p-3 transition-all duration-300 sm:max-w-lg sm:gap-4 sm:p-4 ${
            isHighlighted
              ? "border-accent ring-accent/30 scale-[1.02] shadow-lg ring-2"
              : "border-border hover:border-border/80"
          }`}
        >
          {/* Node Icon */}
          <div className="bg-background border-border/50 text-text-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10">
            <User size={16} className="sm:h-[18px] sm:w-[18px]" />
          </div>

          {/* Node Meta info */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/app/employees/${emp.id}`}
              className="text-text-primary hover:text-accent block truncate text-xs font-semibold transition-colors sm:text-sm"
            >
              {emp.name}
            </Link>
            <span className="text-text-muted mt-0.5 block truncate text-[10px] sm:text-xs">
              {emp.level} • {emp.department}
            </span>
          </div>

          {/* Expansion Action controls */}
          {emp.hasReports && (
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <span className="text-text-muted bg-background border-border/50 inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-semibold sm:gap-1 sm:px-1.5 sm:text-[10px]">
                <Users size={8} className="sm:h-[10px] sm:w-[10px]" />
                {emp.reportsCount}
              </span>
              <button
                onClick={() => handleToggle(emp.id)}
                className="text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md p-0.5 transition-colors sm:p-1"
                aria-label={isExpanded ? "Collapse reports" : "Expand reports"}
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="sm:h-4 sm:w-4" />
                ) : (
                  <ChevronRight size={14} className="sm:h-4 sm:w-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Child report nodes container */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="border-border/40 ml-2 overflow-hidden border-l pl-[16px] sm:ml-5 sm:pl-[36px]"
            >
              {isNodeLoading && (
                <div className="relative mt-3 space-y-3 pl-[16px] sm:pl-[20px]">
                  <div className="border-border/40 absolute top-5 -left-[16px] w-[16px] border-t sm:-left-[20px] sm:w-[20px]" />
                  <Skeleton className="h-16 w-full max-w-lg" />
                </div>
              )}

              {!isNodeLoading &&
                children.map((child) => renderTreeNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-12">
      <PageHeader
        title="Organizational Chart"
        description="Traverse reporting hierarchies of ACME's corporate personnel. Defaults to 2 levels deep."
      />

      <main className="space-y-6">
        {/* Search bar */}
        <Card className="border-border bg-surface p-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search employee by name to trace hierarchy path..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
              />
              <Search
                size={16}
                className="text-text-muted/60 absolute top-2.5 left-3"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSearching}
              className="shrink-0"
            >
              Trace Chain
            </Button>
          </form>
          {searchError && (
            <p className="mt-2 text-xs font-semibold text-rose-500">
              {searchError}
            </p>
          )}
        </Card>

        {/* Hierarchy tree area */}
        <div className="border-border/50 bg-surface/30 min-h-[500px] overflow-x-auto rounded-xl border p-6 md:p-8">
          {isLoadingRoot ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full max-w-lg" />
              <div className="border-border/40 space-y-4 border-l pl-8">
                <Skeleton className="h-16 w-full max-w-lg" />
                <Skeleton className="h-16 w-full max-w-lg" />
              </div>
            </div>
          ) : rootEmployees.length === 0 ? (
            <div className="text-text-muted py-20 text-center italic">
              No top-level personnel records found in the database.
            </div>
          ) : (
            <div className="select-none">
              {rootEmployees.map((emp) => renderTreeNode(emp, 0))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
