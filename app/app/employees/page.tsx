"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FilterX,
  Eye,
  Edit,
  History,
  Download,
  UserX,
  MoreVertical,
  ArrowDownToLine,
  Layers,
  Building2,
  X,
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { ContextMenu, ContextMenuItem } from "@/components/ui/ContextMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/lib/validations/employee";

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  level: string;
  country: string;
  isActive: boolean;
  startDate: string;
}

interface FilterMetadata {
  departments: string[];
  countries: string[];
  levels: string[];
}

export default function EmployeeDirectoryPage() {
  const router = useRouter();

  // Query & state management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalHits, setTotalHits] = useState(0);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [country, setCountry] = useState("");
  const [level, setLevel] = useState("");
  const [isActive, setIsActive] = useState("true");
  const [outsideBand, setOutsideBand] = useState("all");

  // Sorting state
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination state (cursor history)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [limit, setLimit] = useState(50);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Filter options loaded from database
  const [metadata, setMetadata] = useState<FilterMetadata>({
    departments: [],
    countries: [],
    levels: [],
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal forms management
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedViewEmployee, setSelectedViewEmployee] = useState<Employee | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number } | null;
    employee: Employee | null;
  }>({ position: null, employee: null });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "default" | "destructive";
    confirmLabel: string;
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "default",
    confirmLabel: "Confirm",
    onConfirm: () => {},
    isLoading: false,
  });

  // Bulk change modals
  const [bulkDeptOpen, setBulkDeptOpen] = useState(false);
  const [bulkLevelOpen, setBulkLevelOpen] = useState(false);
  const [bulkDeptValue, setBulkDeptValue] = useState("");
  const [bulkLevelValue, setBulkLevelValue] = useState("L1");

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    employeeCode: "",
    department: "",
    level: "L1",
    country: "US",
    startDate: new Date().toISOString().split("T")[0],
    initialSalary: "",
    currency: "USD",
    managerId: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    department: "",
    level: "L1",
    country: "US",
    isActive: true,
    managerId: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Handle search debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset pagination cursor history when search or filters change
  useEffect(() => {
    setCursorHistory([null]);
    setCurrentPageIndex(0);
  }, [
    debouncedSearch,
    department,
    country,
    level,
    isActive,
    outsideBand,
    sortBy,
    sortOrder,
  ]);

  // Fetch filter metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch("/api/employees?metadata=true");
        if (res.ok) {
          const data = await res.json();
          setMetadata(data);
        }
      } catch (err) {
        console.error("Error loading filter metadata:", err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch paginated employees list
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeCursor = cursorHistory[currentPageIndex];
      let url = `/api/employees?limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}&enrichCompa=true`;

      if (debouncedSearch)
        url += `&query=${encodeURIComponent(debouncedSearch)}`;
      if (department) url += `&department=${encodeURIComponent(department)}`;
      if (country) url += `&country=${encodeURIComponent(country)}`;
      if (level) url += `&level=${encodeURIComponent(level)}`;
      if (isActive !== "all") url += `&isActive=${isActive}`;
      if (outsideBand !== "all") url += `&outsideBand=${outsideBand}`;
      if (activeCursor) url += `&cursor=${activeCursor}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
        setNextCursor(data.nextCursor);
        setTotalHits(data.totalHits);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    department,
    country,
    level,
    isActive,
    outsideBand,
    sortBy,
    sortOrder,
    currentPageIndex,
    cursorHistory,
    limit,
  ]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setDepartment("");
    setCountry("");
    setLevel("");
    setIsActive("true");
    setOutsideBand("all");
  };

  const refreshList = () => {
    setCursorHistory([null]);
    setCurrentPageIndex(0);
    setSelectedIds(new Set());
  };

  // ----------------------------------------------------------------
  // Context menu actions
  // ----------------------------------------------------------------

  const handleRowContextMenu = (e: React.MouseEvent, emp: Employee) => {
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      employee: emp,
    });
  };

  const handleKebabClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    emp: Employee,
  ) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      position: { x: rect.right - 180, y: rect.bottom + 4 },
      employee: emp,
    });
  };

  const getContextMenuItems = (emp: Employee): ContextMenuItem[] => [
    {
      label: "View Details",
      icon: <Eye size={14} />,
      onClick: () => router.push(`/app/employees/${emp.id}`),
    },
    {
      label: "Edit",
      icon: <Edit size={14} />,
      onClick: () => handleOpenEdit(emp),
    },
    {
      label: "View Salary History",
      icon: <History size={14} />,
      onClick: () => router.push(`/app/employees/${emp.id}`),
    },
    {
      label: "Export This Employee",
      icon: <Download size={14} />,
      onClick: () => exportSingleEmployee(emp),
    },
    {
      label: emp.isActive ? "Deactivate" : "Reactivate",
      icon: <UserX size={14} />,
      onClick: () => openDeactivateConfirm(emp),
      variant: "destructive" as const,
      separator: true,
    },
  ];

  // ----------------------------------------------------------------
  // Deactivate / reactivate
  // ----------------------------------------------------------------

  const openDeactivateConfirm = (emp: Employee) => {
    const willDeactivate = emp.isActive;
    setConfirmDialog({
      isOpen: true,
      title: willDeactivate ? "Deactivate Employee" : "Reactivate Employee",
      description: willDeactivate
        ? `This will mark ${emp.name} (${emp.employeeCode}) as inactive. This action is reversible — you can reactivate them later.`
        : `This will reactivate ${emp.name} (${emp.employeeCode}) and mark them as active.`,
      variant: willDeactivate ? "destructive" : "default",
      confirmLabel: willDeactivate ? "Deactivate" : "Reactivate",
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/employees/${emp.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !emp.isActive }),
          });
          if (res.ok) {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            refreshList();
          }
        } catch (err) {
          console.error("Deactivate error:", err);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  // ----------------------------------------------------------------
  // Export helpers
  // ----------------------------------------------------------------

  const exportSingleEmployee = (emp: Employee) => {
    const csv = generateCSV([emp]);
    downloadCSV(csv, `employee-${emp.employeeCode}.csv`);
  };

  const exportSelectedEmployees = () => {
    const selected = employees.filter((emp) => selectedIds.has(emp.id));
    if (selected.length === 0) return;
    const csv = generateCSV(selected);
    downloadCSV(csv, `employees-export-${selected.length}.csv`);
  };

  const generateCSV = (emps: Employee[]) => {
    const headers = [
      "Name",
      "Employee ID",
      "Department",
      "Level",
      "Country",
      "Status",
      "Start Date",
    ];
    const rows = emps.map((e) => [
      e.name,
      e.employeeCode,
      e.department,
      e.level,
      e.country,
      e.isActive ? "Active" : "Inactive",
      e.startDate,
    ]);
    return [headers, ...rows].map((r) => r.join(",")).join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------------------
  // Bulk actions
  // ----------------------------------------------------------------

  const handleBulkChangeDept = () => {
    setBulkDeptValue(metadata.departments[0] || "");
    setBulkDeptOpen(true);
  };

  const handleBulkChangeLevel = () => {
    setBulkLevelValue("L1");
    setBulkLevelOpen(true);
  };

  const confirmBulkDeptChange = () => {
    if (!bulkDeptValue) return;
    setConfirmDialog({
      isOpen: true,
      title: "Bulk Change Department",
      description: `This will change the department to "${bulkDeptValue}" for ${selectedIds.size} employee${selectedIds.size !== 1 ? "s" : ""}. This action will be recorded in the audit log.`,
      variant: "default",
      confirmLabel: "Apply Change",
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch("/api/employees/bulk", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ids: Array.from(selectedIds),
              changes: { department: bulkDeptValue },
            }),
          });
          if (res.ok) {
            setBulkDeptOpen(false);
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            refreshList();
          }
        } catch (err) {
          console.error("Bulk department change error:", err);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const confirmBulkLevelChange = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Bulk Change Level",
      description: `This will change the level to "${bulkLevelValue}" for ${selectedIds.size} employee${selectedIds.size !== 1 ? "s" : ""}. This action will be recorded in the audit log.`,
      variant: "default",
      confirmLabel: "Apply Change",
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch("/api/employees/bulk", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ids: Array.from(selectedIds),
              changes: { level: bulkLevelValue },
            }),
          });
          if (res.ok) {
            setBulkLevelOpen(false);
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            refreshList();
          }
        } catch (err) {
          console.error("Bulk level change error:", err);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  // ----------------------------------------------------------------
  // Create / Edit form handlers
  // ----------------------------------------------------------------

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors({});
    setIsCreateSubmitting(true);

    const payload = {
      ...createForm,
      initialSalary: parseFloat(createForm.initialSalary || "0"),
      managerId: createForm.managerId.trim() || null,
    };

    // Client-side Zod Validation
    const validation = createEmployeeSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      const issues = validation.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      Object.keys(issues).forEach((key) => {
        fieldErrors[key] = issues[key]?.[0] || "";
      });
      setCreateErrors(fieldErrors);
      setIsCreateSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const resData = await res.json();

      if (res.ok) {
        setIsCreateOpen(false);
        // Reset Form
        setCreateForm({
          name: "",
          employeeCode: "",
          department: "",
          level: "L1",
          country: "US",
          startDate: new Date().toISOString().split("T")[0],
          initialSalary: "",
          currency: "USD",
          managerId: "",
        });
        refreshList();
      } else {
        setCreateErrors({
          global: resData.error || "Failed to create employee",
        });
      }
    } catch (err) {
      console.error(err);
      setCreateErrors({ global: "An unexpected error occurred." });
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  // Trigger Edit Modal Open
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({
      name: emp.name,
      department: emp.department,
      level: emp.level,
      country: emp.country,
      isActive: emp.isActive,
      managerId: "",
    });
    setEditErrors({});
    setIsEditOpen(true);
  };

  // Submit Edit Employee Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setEditErrors({});
    setIsEditSubmitting(true);

    const payload = {
      name: editForm.name,
      department: editForm.department,
      level: editForm.level,
      country: editForm.country,
      isActive: editForm.isActive,
      managerId: editForm.managerId.trim() || null,
    };

    // Client-side Zod Validation
    const validation = updateEmployeeSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      const issues = validation.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      Object.keys(issues).forEach((key) => {
        fieldErrors[key] = issues[key]?.[0] || "";
      });
      setEditErrors(fieldErrors);
      setIsEditSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const resData = await res.json();

      if (res.ok) {
        setIsEditOpen(false);
        refreshList();
      } else {
        setEditErrors({ global: resData.error || "Failed to update employee" });
      }
    } catch (err) {
      console.error(err);
      setEditErrors({ global: "An unexpected error occurred." });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Columns definition for DataTable
  const columns: ColumnDef<Employee>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (item) => (
        <div className="text-text-primary font-semibold">
          {(item as Employee & { highlightedName?: string }).highlightedName ? (
            <span
              dangerouslySetInnerHTML={{
                __html: (item as Employee & { highlightedName?: string })
                  .highlightedName as string,
              }}
              className="[&>em]:bg-accent/20 [&>em]:text-accent [&>em]:font-bold [&>em]:not-italic"
            />
          ) : (
            item.name
          )}
        </div>
      ),
    },
    { key: "employeeCode", label: "Employee ID", sortable: true },
    { key: "department", label: "Department", sortable: true },
    { key: "level", label: "Level", sortable: true },
    { key: "country", label: "Country", sortable: true },
    {
      key: "compaRatio",
      label: "Compa-Ratio",
      render: (item) => {
        const ratio = (item as any).compaRatio;
        if (ratio === undefined || ratio === null) {
          return (
            <span className="text-text-muted text-xs font-semibold">N/A</span>
          );
        }

        const percent = (ratio * 100).toFixed(1);
        let color = "text-emerald-500 bg-emerald-500/10";
        let label = "Within Band";
        if (ratio < 0.8) {
          color = "text-amber-500 bg-amber-500/10";
          label = "Underpaid";
        } else if (ratio > 1.2) {
          color = "text-rose-500 bg-rose-500/10";
          label = "Premium";
        }

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-text-primary font-mono text-sm font-semibold">
              {percent}%
            </span>
            <span
              className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${color}`}
            >
              {label}
            </span>
          </div>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      render: (item) => (
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
            item.isActive
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-text-muted/10 text-text-muted"
          }`}
        >
          {item.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-12">
      <PageHeader
        title="Employee Directory"
        description="Filter, search, sort, and manage details of ACME's complete payroll workforce."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} className="mr-1.5" />
            Add Employee
          </Button>
        }
      />

      <main className="space-y-6">
        {/* Search & Filter Panel */}
        <Card className="border-border bg-surface p-4">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Search Name / ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
                />
                <Search
                  size={16}
                  className="text-text-muted/60 absolute top-2.5 left-3"
                />
              </div>
            </div>

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
                {metadata.departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
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
                {metadata.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
                {metadata.levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Status
              </label>
              <select
                value={isActive}
                onChange={(e) => setIsActive(e.target.value)}
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              >
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Band Status
              </label>
              <select
                value={outsideBand}
                onChange={(e) => setOutsideBand(e.target.value)}
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="true">Outside Band</option>
                <option value="false">Within Band</option>
              </select>
            </div>

            <Button
              variant="outline"
              className="hover:bg-surface-hover hover:text-text-primary border-border w-full shrink-0 border px-2.5 py-2"
              onClick={handleClearFilters}
              title="Clear Filters"
            >
              <FilterX size={16} className="mr-1.5" />
              Clear
            </Button>
          </div>
        </Card>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={employees}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          nextCursor={nextCursor}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          currentPageIndex={currentPageIndex}
          totalHits={totalHits}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowContextMenu={handleRowContextMenu}
          onRowClick={(emp) => setSelectedViewEmployee(emp)}
          virtualized
          pageSize={limit}
          onPageSizeChange={setLimit}
          rowActions={(emp) => (
            <button
              onClick={(e) => handleKebabClick(e, emp)}
              className="text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md p-1 transition-colors"
              aria-label="Row actions"
            >
              <MoreVertical size={16} />
            </button>
          )}
        />
      </main>

      {/* Context Menu */}
      <ContextMenu
        items={
          contextMenu.employee ? getContextMenuItems(contextMenu.employee) : []
        }
        position={contextMenu.position}
        onClose={() => setContextMenu({ position: null, employee: null })}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        isLoading={confirmDialog.isLoading}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: "Export Selected",
            icon: <ArrowDownToLine size={14} />,
            onClick: exportSelectedEmployees,
          },
          {
            label: "Change Department",
            icon: <Building2 size={14} />,
            onClick: handleBulkChangeDept,
          },
          {
            label: "Change Level",
            icon: <Layers size={14} />,
            onClick: handleBulkChangeLevel,
          },
        ]}
      />

      {/* Employee Detail Slide-over Panel */}
      <AnimatePresence>
        {selectedViewEmployee && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedViewEmployee(null)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide-over panel container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="bg-surface border-border fixed top-0 right-0 bottom-0 z-50 flex h-full w-full max-w-md flex-col border-l shadow-2xl p-6 md:p-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h3 className="text-text-primary text-base font-bold">
                    Employee Profile
                  </h3>
                  <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider mt-0.5">
                    Quick View
                  </p>
                </div>
                <button
                  onClick={() => setSelectedViewEmployee(null)}
                  className="text-text-muted hover:text-text-primary hover:bg-surface-hover rounded p-1 transition-colors cursor-pointer animate-in"
                  aria-label="Close details panel"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto py-6 space-y-6 no-scrollbar">
                {/* Avatar and Name */}
                <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-border/40">
                  <div className="bg-accent/15 text-accent flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold select-none shadow-inner animate-in">
                    {selectedViewEmployee.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-text-primary text-lg font-bold">
                      {selectedViewEmployee.name}
                    </h4>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-text-muted text-xs font-semibold">
                        {selectedViewEmployee.employeeCode}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selectedViewEmployee.isActive
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedViewEmployee.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {selectedViewEmployee.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 bg-background/40 border border-border/40 rounded-xl p-4">
                  <div className="space-y-0.5">
                    <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                      Department
                    </span>
                    <p className="text-text-primary text-sm font-semibold truncate">
                      {selectedViewEmployee.department}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                      Level
                    </span>
                    <p className="text-text-primary text-sm font-semibold truncate">
                      {selectedViewEmployee.level}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                      Country
                    </span>
                    <p className="text-text-primary text-sm font-semibold truncate">
                      {selectedViewEmployee.country}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                      Start Date
                    </span>
                    <p className="text-text-primary text-sm font-semibold truncate">
                      {new Date(selectedViewEmployee.startDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Action Links/Shortcuts */}
                <div className="space-y-2.5">
                  <h5 className="text-text-muted text-[10px] font-bold tracking-wider uppercase px-1">
                    Compensation Actions
                  </h5>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedViewEmployee(null);
                        handleOpenEdit(selectedViewEmployee);
                      }}
                      className="flex w-full items-center justify-between bg-surface border border-border hover:bg-surface-hover/80 px-4 py-3 rounded-xl text-xs font-semibold text-text-primary transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Edit size={14} className="text-accent" />
                        <span>Edit Employee Profile</span>
                      </div>
                      <ChevronRight size={14} className="text-text-muted" />
                    </button>

                    <button
                      onClick={() => {
                        router.push(`/app/employees/${selectedViewEmployee.id}`);
                      }}
                      className="flex w-full items-center justify-between bg-surface border border-border hover:bg-surface-hover/80 px-4 py-3 rounded-xl text-xs font-semibold text-text-primary transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Eye size={14} className="text-accent" />
                        <span>View Full Salary Timeline</span>
                      </div>
                      <ChevronRight size={14} className="text-text-muted" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border/40 pt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 hover:bg-surface-hover px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors"
                  onClick={() => setSelectedViewEmployee(null)}
                >
                  Close Panel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors"
                  onClick={() => {
                    router.push(`/app/employees/${selectedViewEmployee.id}`);
                  }}
                >
                  Go to Profile
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk Change Department Modal */}
      <Modal
        isOpen={bulkDeptOpen}
        onClose={() => setBulkDeptOpen(false)}
        title="Bulk Change Department"
      >
        <div className="space-y-4">
          <p className="text-text-muted text-sm">
            Select the new department for {selectedIds.size} selected employee
            {selectedIds.size !== 1 ? "s" : ""}.
          </p>
          <div className="space-y-1.5">
            <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
              New Department
            </label>
            <select
              value={bulkDeptValue}
              onChange={(e) => setBulkDeptValue(e.target.value)}
              className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
            >
              {metadata.departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setBulkDeptOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmBulkDeptChange}>
              Continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Change Level Modal */}
      <Modal
        isOpen={bulkLevelOpen}
        onClose={() => setBulkLevelOpen(false)}
        title="Bulk Change Level"
      >
        <div className="space-y-4">
          <p className="text-text-muted text-sm">
            Select the new level for {selectedIds.size} selected employee
            {selectedIds.size !== 1 ? "s" : ""}.
          </p>
          <div className="space-y-1.5">
            <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
              New Level
            </label>
            <select
              value={bulkLevelValue}
              onChange={(e) => setBulkLevelValue(e.target.value)}
              className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setBulkLevelOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmBulkLevelChange}>
              Continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Employee"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createErrors.global && (
            <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-xs font-medium">
              {createErrors.global}
            </div>
          )}

          <FormField
            label="Name"
            type="text"
            placeholder="John Doe"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm({ ...createForm, name: e.target.value })
            }
            error={createErrors.name}
            required
          />

          <FormField
            label="Employee ID (Code)"
            type="text"
            placeholder="EMP-01001"
            value={createForm.employeeCode}
            onChange={(e) =>
              setCreateForm({ ...createForm, employeeCode: e.target.value })
            }
            error={createErrors.employeeCode}
            required
          />

          <FormField
            label="Department"
            type="text"
            placeholder="Engineering"
            value={createForm.department}
            onChange={(e) =>
              setCreateForm({ ...createForm, department: e.target.value })
            }
            error={createErrors.department}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Level
              </label>
              <select
                value={createForm.level}
                onChange={(e) =>
                  setCreateForm({ ...createForm, level: e.target.value })
                }
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              >
                {LEVELS.map((l) => (
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
                value={createForm.country}
                onChange={(e) =>
                  setCreateForm({ ...createForm, country: e.target.value })
                }
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormField
            label="Start Date"
            type="date"
            value={createForm.startDate}
            onChange={(e) =>
              setCreateForm({ ...createForm, startDate: e.target.value })
            }
            error={createErrors.startDate}
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <FormField
                label="Initial Base Salary"
                type="number"
                placeholder="50000"
                value={createForm.initialSalary}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    initialSalary: e.target.value,
                  })
                }
                error={createErrors.initialSalary}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Currency
              </label>
              <select
                value={createForm.currency}
                onChange={(e) =>
                  setCreateForm({ ...createForm, currency: e.target.value })
                }
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.currency} value={c.currency}>
                    {c.currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormField
            label="Manager ID (UUID, Optional)"
            type="text"
            placeholder="e.g. 7c94b1a4-96ff-4c54-b52e..."
            value={createForm.managerId}
            onChange={(e) =>
              setCreateForm({ ...createForm, managerId: e.target.value })
            }
            error={createErrors.managerId}
          />

          <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isCreateSubmitting}
            >
              Create Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Employee"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editErrors.global && (
            <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-xs font-medium">
              {editErrors.global}
            </div>
          )}

          <FormField
            label="Name"
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            error={editErrors.name}
            required
          />

          <FormField
            label="Department"
            type="text"
            value={editForm.department}
            onChange={(e) =>
              setEditForm({ ...editForm, department: e.target.value })
            }
            error={editErrors.department}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Level
              </label>
              <select
                value={editForm.level}
                onChange={(e) =>
                  setEditForm({ ...editForm, level: e.target.value })
                }
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              >
                {LEVELS.map((l) => (
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
                value={editForm.country}
                onChange={(e) =>
                  setEditForm({ ...editForm, country: e.target.value })
                }
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormField
            label="Manager ID (UUID, Optional)"
            type="text"
            placeholder="e.g. 7c94b1a4-96ff-4c54-b52e..."
            value={editForm.managerId}
            onChange={(e) =>
              setEditForm({ ...editForm, managerId: e.target.value })
            }
            error={editErrors.managerId}
          />

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isActiveEdit"
              checked={editForm.isActive}
              onChange={(e) =>
                setEditForm({ ...editForm, isActive: e.target.checked })
              }
              className="border-border bg-background text-accent focus:ring-accent h-4 w-4 rounded"
            />
            <label
              htmlFor="isActiveEdit"
              className="text-text-primary text-sm font-semibold"
            >
              Active Employee
            </label>
          </div>

          <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isEditSubmitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Config mappings for drop options
const LEVELS = ["L1", "L2", "L3", "L4", "L5"];
const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "UK", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "BR", name: "Brazil", currency: "BRL" },
];
