"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Pencil, FilterX } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { z } from "zod";

interface Band {
  id: string;
  department: string;
  level: string;
  country: string;
  minAmount: number;
  midAmount: number;
  maxAmount: number;
  currency: string;
}

interface FilterMeta {
  departments: string[];
  levels: string[];
  countries: string[];
}

export default function CompensationBandsPage() {
  const [bands, setBands] = useState<Band[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [country, setCountry] = useState("");
  const [meta, setMeta] = useState<FilterMeta>({
    departments: [],
    levels: [],
    countries: [],
  });

  // Edit modal
  const [editBand, setEditBand] = useState<Band | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    minAmount: "",
    midAmount: "",
    maxAmount: "",
    currency: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("department");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch metadata on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch("/api/compensation-bands?metadata=true");
        if (res.ok) {
          const data = await res.json();
          setMeta(data);
        }
      } catch (err) {
        console.error("Error loading band metadata:", err);
      }
    };
    fetchMeta();
  }, []);

  // Fetch bands
  const fetchBands = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/compensation-bands?";
      if (department) url += `department=${encodeURIComponent(department)}&`;
      if (level) url += `level=${encodeURIComponent(level)}&`;
      if (country) url += `country=${encodeURIComponent(country)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBands(data.bands);
      }
    } catch (err) {
      console.error("Error fetching bands:", err);
    } finally {
      setIsLoading(false);
    }
  }, [department, level, country]);

  useEffect(() => {
    fetchBands();
  }, [fetchBands]);

  // Client-side sort
  const sortedBands = [...bands].sort((a, b) => {
    const aVal = a[sortBy as keyof Band];
    const bVal = b[sortBy as keyof Band];
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

  // Edit band
  const openEdit = (band: Band) => {
    setEditBand(band);
    setEditForm({
      minAmount: String(band.minAmount),
      midAmount: String(band.midAmount),
      maxAmount: String(band.maxAmount),
      currency: band.currency,
    });
    setEditErrors({});
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBand) return;
    setEditErrors({});
    setIsSubmitting(true);

    const min = parseFloat(editForm.minAmount);
    const mid = parseFloat(editForm.midAmount);
    const max = parseFloat(editForm.maxAmount);

    const schema = z
      .object({
        minAmount: z.number().positive("Min amount must be greater than 0"),
        midAmount: z.number().positive("Mid amount must be greater than 0"),
        maxAmount: z.number().positive("Max amount must be greater than 0"),
      })
      .refine(
        (data) =>
          data.minAmount <= data.midAmount && data.midAmount <= data.maxAmount,
        {
          message: "Amounts must satisfy: min <= mid <= max",
          path: ["global"],
        },
      );

    const validation = schema.safeParse({
      minAmount: min,
      midAmount: mid,
      maxAmount: max,
    });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const path = String(err.path[0] || "global");
        fieldErrors[path] = err.message;
      });
      setEditErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/compensation-bands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editBand.id,
          minAmount: min,
          midAmount: mid,
          maxAmount: max,
          currency: editForm.currency,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsEditOpen(false);
        fetchBands();
      } else {
        setEditErrors({ global: data.error || "Failed to update band" });
      }
    } catch (err) {
      console.error(err);
      setEditErrors({ global: "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Band>[] = [
    { key: "department", label: "Department", sortable: true },
    { key: "level", label: "Level", sortable: true },
    { key: "country", label: "Country", sortable: true },
    {
      key: "minAmount",
      label: "Min",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs">
          {formatCurrency(b.minAmount, b.currency)}
        </span>
      ),
    },
    {
      key: "midAmount",
      label: "Midpoint",
      sortable: true,
      render: (b) => (
        <span className="text-accent font-mono text-xs font-semibold">
          {formatCurrency(b.midAmount, b.currency)}
        </span>
      ),
    },
    {
      key: "maxAmount",
      label: "Max",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs">
          {formatCurrency(b.maxAmount, b.currency)}
        </span>
      ),
    },
    { key: "currency", label: "Currency" },
    {
      key: "actions",
      label: "",
      render: (b) => (
        <button
          onClick={() => openEdit(b)}
          className="text-text-muted hover:text-accent flex items-center gap-1 text-xs font-medium transition-colors"
        >
          <Pencil size={13} />
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-12">
      <PageHeader
        title="Compensation Bands"
        description={`${bands.length} band${bands.length !== 1 ? "s" : ""} across all departments, levels, and countries.`}
      />

      <main className="space-y-6">
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
              className="hover:bg-surface-hover border-border border px-2.5 py-2"
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
          data={sortedBands}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          totalHits={bands.length}
          virtualized
        />
      </main>

      {/* Edit Band Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={
          editBand
            ? `Edit Band: ${editBand.department} / ${editBand.level} / ${editBand.country}`
            : "Edit Band"
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editErrors.global && (
            <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-xs font-medium">
              {editErrors.global}
            </div>
          )}

          <FormField
            label="Min Amount"
            type="number"
            value={editForm.minAmount}
            onChange={(e) =>
              setEditForm({ ...editForm, minAmount: e.target.value })
            }
            error={editErrors.minAmount}
            required
          />
          <FormField
            label="Midpoint Amount"
            type="number"
            value={editForm.midAmount}
            onChange={(e) =>
              setEditForm({ ...editForm, midAmount: e.target.value })
            }
            error={editErrors.midAmount}
            required
          />
          <FormField
            label="Max Amount"
            type="number"
            value={editForm.maxAmount}
            onChange={(e) =>
              setEditForm({ ...editForm, maxAmount: e.target.value })
            }
            error={editErrors.maxAmount}
            required
          />

          <div className="space-y-1.5">
            <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
              Currency
            </label>
            <select
              value={editForm.currency}
              onChange={(e) =>
                setEditForm({ ...editForm, currency: e.target.value })
              }
              className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
            >
              {["USD", "INR", "GBP", "EUR", "SGD", "BRL"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
