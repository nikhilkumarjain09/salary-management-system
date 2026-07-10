"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FilterX,
  TrendingDown,
  TrendingUp,
  Globe,
  BarChart2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { ComparisonGauge } from "@/components/ui/ComparisonGauge";

interface BenchmarkComparison {
  id: string;
  department: string;
  level: string;
  country: string;
  benchmarkAmount: number;
  currency: string;
  percentile: number;
  sourceLabel: string;
  employeeCount: number;
  averageSalary: number;
  variancePercent: number;
}

interface FilterMeta {
  departments: string[];
  levels: string[];
  countries: string[];
}

export default function BenchmarkingPage() {
  const [comparisons, setComparisons] = useState<BenchmarkComparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] =
    useState<BenchmarkComparison | null>(null);

  // Filters
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [country, setCountry] = useState("");
  const [meta, setMeta] = useState<FilterMeta>({
    departments: [],
    levels: [],
    countries: [],
  });

  // Sorting
  const [sortBy, setSortBy] = useState("department");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch filter metadata on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch("/api/benchmarking?metadata=true");
        if (res.ok) {
          const data = await res.json();
          setMeta(data.metadata);
          setComparisons(data.comparisons);
          if (data.comparisons.length > 0) {
            setSelectedGroup(data.comparisons[0]);
          }
        }
      } catch (err) {
        console.error("Error loading benchmarking metadata:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeta();
  }, []);

  // Fetch benchmarking comparisons
  const fetchComparisons = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/benchmarking?";
      if (department) url += `department=${encodeURIComponent(department)}&`;
      if (level) url += `level=${encodeURIComponent(level)}&`;
      if (country) url += `country=${encodeURIComponent(country)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComparisons(data.comparisons);

        // Keep selection active if it still matches or pick first match
        if (data.comparisons.length > 0) {
          const stillExists = data.comparisons.find(
            (c: BenchmarkComparison) => c.id === selectedGroup?.id,
          );
          setSelectedGroup(stillExists || data.comparisons[0]);
        } else {
          setSelectedGroup(null);
        }
      }
    } catch (err) {
      console.error("Error fetching benchmarking data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [department, level, country, selectedGroup?.id]);

  useEffect(() => {
    // Skip initial load fetch since metadata endpoint already returns initial comparisons
    if (meta.departments.length > 0) {
      fetchComparisons();
    }
  }, [fetchComparisons]);

  // Client-side sort
  const sortedComparisons = [...comparisons].sort((a, b) => {
    const aVal = a[sortBy as keyof BenchmarkComparison];
    const bVal = b[sortBy as keyof BenchmarkComparison];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortOrder === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const handleClearFilters = () => {
    setDepartment("");
    setLevel("");
    setCountry("");
  };

  const formatCurrency = (val: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);

  const columns: ColumnDef<BenchmarkComparison>[] = [
    { key: "department", label: "Department", sortable: true },
    { key: "level", label: "Level", sortable: true },
    { key: "country", label: "Country", sortable: true },
    {
      key: "averageSalary",
      label: "Group Avg Pay",
      sortable: true,
      render: (c) => (
        <span className="font-mono text-xs font-semibold">
          {c.averageSalary > 0
            ? formatCurrency(c.averageSalary, c.currency)
            : "N/A"}
        </span>
      ),
    },
    {
      key: "benchmarkAmount",
      label: "Market Rate",
      sortable: true,
      render: (c) => (
        <span className="font-mono text-xs">
          {formatCurrency(c.benchmarkAmount, c.currency)}
        </span>
      ),
    },
    {
      key: "variancePercent",
      label: "Variance",
      sortable: true,
      render: (c) => {
        if (c.averageSalary === 0)
          return (
            <span className="text-text-muted text-xs font-semibold">-</span>
          );
        const isPositive = c.variancePercent >= 0;
        const color = isPositive ? "text-emerald-500" : "text-rose-500";
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? "+" : ""}
            {c.variancePercent}%
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "",
      render: (c) => (
        <button
          onClick={() => setSelectedGroup(c)}
          className={`text-xs font-medium transition-colors ${
            selectedGroup?.id === c.id
              ? "text-accent font-bold"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Select View
        </button>
      ),
    },
  ];

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-12">
      <PageHeader
        title="Compensation Benchmarking"
        description="Audit internal pay rates against seeded illustrative market benchmark data distributions."
      />

      <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Left Side: Table & Filters */}
        <div className="space-y-6 lg:col-span-2">
          {/* Filters */}
          <Card className="border-border bg-surface p-4">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {meta.departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                >
                  <option value="">All Levels</option>
                  {meta.levels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
                >
                  <option value="">All Countries</option>
                  {meta.countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                className="hover:bg-surface-hover border-border w-full border px-2.5 py-2"
                onClick={handleClearFilters}
                title="Clear Filters"
              >
                <FilterX size={16} className="mr-1.5" />
                Clear
              </Button>
            </div>
          </Card>

          {/* Table */}
          <DataTable
            columns={columns}
            data={sortedComparisons}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            totalHits={comparisons.length}
          />
        </div>

        {/* Right Side: Selected Group Comparison Gauge */}
        <div className="space-y-6 lg:col-span-1">
          {selectedGroup ? (
            <Card className="border-border bg-surface space-y-4 p-6">
              <div className="border-border/40 flex items-center gap-2 border-b pb-4">
                <BarChart2 className="text-accent shrink-0" size={20} />
                <div>
                  <h3 className="text-text-primary text-base font-bold">
                    Group Comparison Details
                  </h3>
                  <p className="text-text-muted text-xs">
                    {selectedGroup.department} • {selectedGroup.level} •{" "}
                    {selectedGroup.country}
                  </p>
                </div>
              </div>

              <ComparisonGauge
                actual={selectedGroup.averageSalary}
                benchmark={selectedGroup.benchmarkAmount}
                currency={selectedGroup.currency}
                sourceLabel={selectedGroup.sourceLabel}
                label="Average Pay vs. Market Rate"
              />

              <div className="bg-background/30 border-border/40 grid grid-cols-2 gap-4 rounded-xl border p-4 text-xs">
                <div>
                  <span className="text-text-muted block">
                    Active Employee Count
                  </span>
                  <span className="text-text-primary mt-0.5 block text-sm font-bold">
                    {selectedGroup.employeeCount}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">
                    Target Percentile
                  </span>
                  <span className="text-text-primary mt-0.5 block inline-flex items-center gap-1 text-sm font-bold">
                    <Globe size={12} className="text-text-muted/65" />P
                    {selectedGroup.percentile}
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-border bg-surface text-text-muted p-12 text-center text-sm italic">
              Select a group from the comparison table to view detailed
              benchmark gauge.
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
