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
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { ContextMenu, ContextMenuItem } from "@/components/ui/ContextMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { createEmployeeSchema } from "@/lib/validations/employee";

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

  // Sorting state
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination state (cursor history)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
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
      let url = `/api/employees?limit=15&sortBy=${sortBy}&sortOrder=${sortOrder}`;

      if (debouncedSearch)
        url += `&query=${encodeURIComponent(debouncedSearch)}`;
      if (department) url += `&department=${encodeURIComponent(department)}`;
      if (country) url += `&country=${encodeURIComponent(country)}`;
      if (level) url += `&level=${encodeURIComponent(level)}`;
      if (isActive !== "all") url += `&isActive=${isActive}`;
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
    sortBy,
    sortOrder,
    currentPageIndex,
    cursorHistory,
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

    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 md:grid-cols-6">
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

            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
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

              <Button
                variant="outline"
                className="hover:bg-surface-hover hover:text-text-primary border-border shrink-0 border px-2.5 py-2"
                onClick={handleClearFilters}
                title="Clear Filters"
              >
                <FilterX size={16} />
              </Button>
            </div>
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
