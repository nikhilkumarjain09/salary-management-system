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
  Globe,
  Activity,
  Sliders,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle,
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
import { CustomSelect } from "@/components/ui/CustomSelect";
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
  const [searchMode, setSearchMode] = useState("startsWith");

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
  
  // Bulk Upload States
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkErrorsCount, setBulkErrorsCount] = useState(0);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);

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

  const [errorPopup, setErrorPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "error" | "warning" | "success" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error",
  });

  const showError = (
    title: string,
    message: string,
    type: "error" | "warning" | "success" | "info" = "error"
  ) => {
    setErrorPopup({
      isOpen: true,
      title,
      message,
      type,
    });
  };

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

      if (debouncedSearch) {
        url += `&query=${encodeURIComponent(debouncedSearch)}`;
        url += `&searchMode=${searchMode}`;
      }
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
    searchMode,
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
    setSearchMode("startsWith");
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
    {
      label: "Remove/Delete",
      icon: <Trash2 size={14} />,
      onClick: () => openDeleteConfirm(emp),
      variant: "destructive" as const,
      separator: false,
    },
  ];

  // ----------------------------------------------------------------
  // Deactivate / reactivate / delete
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

  const openDeleteConfirm = (emp: Employee) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Employee Record",
      description: `WARNING: This will permanently delete ${emp.name} (${emp.employeeCode}) and all of their historical salary records. This action is irreversible.`,
      variant: "destructive",
      confirmLabel: "Delete Record",
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await fetch(`/api/employees/${emp.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            refreshList();
          } else {
            const errData = await res.json();
            if (res.status === 404) {
              setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
              setTotalHits((prev) => Math.max(0, prev - 1));
              showError(
                "Record Already Deleted",
                `The employee record for ${emp.name} (${emp.employeeCode}) was not found in the database. It has been cleared from your local directory view.`,
                "warning"
              );
            } else {
              showError(
                "Delete Failed",
                errData.error || "Failed to delete employee record.",
                "error"
              );
            }
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        } catch (err) {
          console.error("Delete error:", err);
          showError(
            "Network Error",
            "An unexpected network error occurred while attempting to delete the record.",
            "error"
          );
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
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
  // Bulk CSV Upload & Import Handlers
  // ----------------------------------------------------------------

  const downloadSampleTemplate = () => {
    const csvContent =
      "name,employeeCode,department,level,country,startDate,initialSalary,currency,managerId\n" +
      "Alice Smith,EMP-09001,Engineering,L3,US,2026-01-15,95000,USD,\n" +
      "Bob Jones,EMP-09002,Marketing,L2,UK,2026-02-01,45000,GBP,\n" +
      "Charlie Gupta,EMP-09003,Sales,L4,IN,2026-02-10,1800000,INR,";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employees_bulk_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCSVText = (text: string) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push("");
      } else if ((char === "\r" || char === "\n") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip \n
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkImportError(null);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = parseCSVText(text);

      if (rows.length < 2) {
        setBulkImportError("The CSV file is empty or missing data rows.");
        setBulkPreview([]);
        setBulkErrorsCount(0);
        return;
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const expectedHeaders = [
        "name",
        "employeecode",
        "department",
        "level",
        "country",
        "startdate",
        "initialsalary",
        "currency",
        "managerid",
      ];

      const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setBulkImportError(
          `Invalid template. Missing headers: ${missingHeaders.join(", ")}`
        );
        setBulkPreview([]);
        setBulkErrorsCount(0);
        return;
      }

      const dataRows = rows.slice(1).filter((r) => r.length > 1 && r.some((c) => c.trim() !== ""));
      const previewData: any[] = [];
      let errorsCount = 0;

      dataRows.forEach((row, index) => {
        const item: Record<string, any> = {};
        headers.forEach((header, colIndex) => {
          item[header] = row[colIndex]?.trim() || "";
        });

        const formatted: Record<string, any> = {
          name: item.name,
          employeeCode: item.employeecode,
          department: item.department,
          level: item.level,
          country: item.country,
          startDate: item.startdate,
          initialSalary: item.initialsalary ? parseFloat(item.initialsalary) : NaN,
          currency: item.currency,
          managerId: item.managerid || null,
        };

        const validationErrors: string[] = [];
        if (!formatted.name) validationErrors.push("Name is required");
        if (!formatted.employeeCode || formatted.employeeCode.length < 3) {
          validationErrors.push("Employee ID must be >= 3 characters");
        }
        if (!formatted.department) validationErrors.push("Department is required");
        
        const validLevels = ["L1", "L2", "L3", "L4", "L5"];
        if (!validLevels.includes(formatted.level)) {
          validationErrors.push(`Level must be L1-L5 (got "${formatted.level}")`);
        }

        const validCountries = COUNTRIES.map((c) => c.code);
        if (!validCountries.includes(formatted.country)) {
          validationErrors.push(`Invalid Country: "${formatted.country}"`);
        }

        const validCurrencies = Array.from(new Set(COUNTRIES.map((c) => c.currency)));
        if (!validCurrencies.includes(formatted.currency)) {
          validationErrors.push(`Invalid Currency: "${formatted.currency}"`);
        }

        if (isNaN(formatted.initialSalary) || formatted.initialSalary < 0) {
          validationErrors.push("Salary must be >= 0");
        }

        if (formatted.startDate) {
          const d = new Date(formatted.startDate);
          if (isNaN(d.getTime())) {
            validationErrors.push("Invalid date format (use YYYY-MM-DD)");
          }
        } else {
          validationErrors.push("Start Date is required");
        }

        if (formatted.managerId) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(formatted.managerId)) {
            validationErrors.push("Manager ID must be a valid UUID");
          }
        }

        if (validationErrors.length > 0) {
          errorsCount++;
        }

        previewData.push({
          rowNumber: index + 2,
          data: formatted,
          errors: validationErrors,
        });
      });

      setBulkPreview(previewData);
      setBulkErrorsCount(errorsCount);
    };

    reader.readAsText(file);
  };

  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkErrorsCount > 0) return;
    if (bulkPreview.length === 0) return;

    setIsBulkImporting(true);
    setBulkImportError(null);

    const payload = bulkPreview.map((p) => p.data);

    try {
      const res = await fetch("/api/employees/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (res.ok) {
        setIsBulkUploadOpen(false);
        setBulkFile(null);
        setBulkPreview([]);
        setBulkErrorsCount(0);
        refreshList();
      } else {
        setBulkImportError(resData.error || "Failed to import employees.");
      }
    } catch (err) {
      console.error(err);
      setBulkImportError("An unexpected network error occurred.");
    } finally {
      setIsBulkImporting(false);
    }
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
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 md:p-6">
      <PageHeader
        title="Employee Directory"
        description="Filter, search, sort, and manage details of ACME's complete payroll workforce."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkUploadOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Upload size={16} />
              Bulk Upload
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add Employee
            </Button>
          </div>
        }
      />

      <main className="space-y-4">
        {/* Search & Filter Panel */}
        <Card className="border-border bg-surface p-3">
          <div className="space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="space-y-1.5">
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
                  Search Mode
                </label>
                <CustomSelect
                  value={searchMode}
                  onChange={setSearchMode}
                  options={[
                    { value: "startsWith", label: "Starts With", icon: <Sliders size={14} className="text-text-muted/60" /> },
                    { value: "exact", label: "Exact Match", icon: <Sliders size={14} className="text-accent" /> },
                    { value: "contains", label: "Contains", icon: <Sliders size={14} className="text-text-muted/80" /> },
                  ]}
                  placeholder="Starts With"
                  icon={<Sliders size={14} className="text-text-muted/60" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Department
                </label>
                <CustomSelect
                  value={department}
                  onChange={setDepartment}
                  options={[
                    { value: "", label: "All Departments", icon: <Building2 size={14} className="text-text-muted/60" /> },
                    ...metadata.departments.map((dept) => ({
                      value: dept,
                      label: dept,
                      icon: <Building2 size={14} className="text-text-muted/80" />,
                    })),
                  ]}
                  placeholder="All Departments"
                  icon={<Building2 size={14} className="text-text-muted/60" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Country
                </label>
                <CustomSelect
                  value={country}
                  onChange={setCountry}
                  options={[
                    { value: "", label: "All Countries", icon: <Globe size={14} className="text-text-muted/60" /> },
                    ...metadata.countries.map((c) => ({
                      value: c,
                      label: c === "US" ? "United States" : c === "IN" ? "India" : c === "UK" ? "United Kingdom" : c === "DE" ? "Germany" : c === "SG" ? "Singapore" : c === "BR" ? "Brazil" : c,
                      icon: <Globe size={14} className="text-text-muted/80" />,
                    })),
                  ]}
                  placeholder="All Countries"
                  icon={<Globe size={14} className="text-text-muted/60" />}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end pt-3 border-t border-border/10">
              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Level
                </label>
                <CustomSelect
                  value={level}
                  onChange={setLevel}
                  options={[
                    { value: "", label: "All Levels", icon: <Layers size={14} className="text-text-muted/60" /> },
                    ...metadata.levels.map((l) => ({
                      value: l,
                      label: l,
                      icon: <Layers size={14} className="text-text-muted/80" />,
                    })),
                  ]}
                  placeholder="All Levels"
                  icon={<Layers size={14} className="text-text-muted/60" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Status
                </label>
                <CustomSelect
                  value={isActive}
                  onChange={setIsActive}
                  options={[
                    { value: "all", label: "All Statuses", icon: <Activity size={14} className="text-text-muted/60" /> },
                    { value: "true", label: "Active Only", icon: <Activity size={14} className="text-emerald-500" /> },
                    { value: "false", label: "Inactive Only", icon: <Activity size={14} className="text-rose-500" /> },
                  ]}
                  placeholder="All Statuses"
                  icon={<Activity size={14} className="text-text-muted/60" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                  Band Status
                </label>
                <CustomSelect
                  value={outsideBand}
                  onChange={setOutsideBand}
                  options={[
                    { value: "all", label: "All Bands", icon: <Sliders size={14} className="text-text-muted/60" /> },
                    { value: "true", label: "Outside Band", icon: <Sliders size={14} className="text-rose-500" /> },
                    { value: "false", label: "Within Band", icon: <Sliders size={14} className="text-emerald-500" /> },
                  ]}
                  placeholder="All Bands"
                  icon={<Sliders size={14} className="text-text-muted/60" />}
                />
              </div>

              <Button
                variant="outline"
                className="hover:bg-surface-hover hover:text-text-primary border-border w-full shrink-0 border px-2.5 py-2 h-[38px] flex items-center justify-center"
                onClick={handleClearFilters}
                title="Clear Filters"
              >
                <FilterX size={16} className="mr-1.5" />
                Clear
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

                    <button
                      onClick={() => {
                        setSelectedViewEmployee(null);
                        openDeactivateConfirm(selectedViewEmployee);
                      }}
                      className="flex w-full items-center justify-between bg-surface border border-border hover:bg-surface-hover/80 px-4 py-3 rounded-xl text-xs font-semibold text-text-primary transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserX size={14} className="text-accent" />
                        <span>{selectedViewEmployee.isActive ? "Deactivate Employee" : "Reactivate Employee"}</span>
                      </div>
                      <ChevronRight size={14} className="text-text-muted" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedViewEmployee(null);
                        openDeleteConfirm(selectedViewEmployee);
                      }}
                      className="flex w-full items-center justify-between bg-surface border border-border hover:bg-rose-500/10 px-4 py-3 rounded-xl text-xs font-semibold text-rose-500 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 size={14} className="text-rose-500" />
                        <span>Delete Record (Irreversible)</span>
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
              <CustomSelect
                value={createForm.level}
                onChange={(val) => setCreateForm({ ...createForm, level: val })}
                options={LEVELS.map((l) => ({ value: l, label: l }))}
                placeholder="Select level"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Country
              </label>
              <CustomSelect
                value={createForm.country}
                onChange={(val) => {
                  const matchingCountry = COUNTRIES.find((c) => c.code === val);
                  setCreateForm({
                    ...createForm,
                    country: val,
                    currency: matchingCountry?.currency || "USD",
                  });
                }}
                options={COUNTRIES.map((c) => ({
                  value: c.code,
                  label: `${c.flag} ${c.name}`,
                }))}
                placeholder="Select country"
              />
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
              <CustomSelect
                value={createForm.currency}
                onChange={(val) => setCreateForm({ ...createForm, currency: val })}
                options={Array.from(new Set(COUNTRIES.map((c) => c.currency))).map((curr) => ({
                  value: curr,
                  label: curr,
                }))}
                placeholder="Currency"
              />
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
              <CustomSelect
                value={editForm.level}
                onChange={(val) => setEditForm({ ...editForm, level: val })}
                options={LEVELS.map((l) => ({ value: l, label: l }))}
                placeholder="Select level"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Country
              </label>
              <CustomSelect
                value={editForm.country}
                onChange={(val) => setEditForm({ ...editForm, country: val })}
                options={COUNTRIES.map((c) => ({
                  value: c.code,
                  label: `${c.flag} ${c.name}`,
                }))}
                placeholder="Select country"
              />
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

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={isBulkUploadOpen}
        onClose={() => {
          setIsBulkUploadOpen(false);
          setBulkFile(null);
          setBulkPreview([]);
          setBulkErrorsCount(0);
          setBulkImportError(null);
        }}
        title="Bulk Import Employees"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
          <div className="bg-surface border-border flex items-center justify-between rounded-lg border p-4">
            <div>
              <h4 className="text-text-primary text-sm font-bold">CSV Template</h4>
              <p className="text-text-muted mt-1 text-xs">
                Download our sample template with correct column headers and formatting.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 shrink-0"
            >
              <Download size={14} /> Template
            </Button>
          </div>

          <form onSubmit={handleBulkUploadSubmit} className="space-y-4">
            {bulkImportError && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-xs font-medium flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{bulkImportError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkFileChange}
                className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
              />
            </div>

            {bulkPreview.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-text-primary text-xs font-bold uppercase tracking-wider">
                    Upload Preview ({bulkPreview.length} rows)
                  </h4>
                  {bulkErrorsCount > 0 ? (
                    <span className="bg-rose-500/10 text-rose-500 rounded px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle size={12} /> {bulkErrorsCount} rows with errors
                    </span>
                  ) : (
                    <span className="bg-emerald-500/10 text-emerald-500 rounded px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                      <CheckCircle size={12} /> Ready for Import
                    </span>
                  )}
                </div>

                <div className="border-border max-h-60 overflow-auto rounded-lg border">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-background text-text-muted border-b border-border font-semibold">
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Dept</th>
                        <th className="px-3 py-2">Lvl</th>
                        <th className="px-3 py-2">Ctry</th>
                        <th className="px-3 py-2">Salary</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-surface">
                      {bulkPreview.map((item, idx) => {
                        const hasErrors = item.errors.length > 0;
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-background/40 transition-colors ${
                              hasErrors ? "bg-rose-500/5" : ""
                            }`}
                          >
                            <td className="px-3 py-2 font-mono text-text-muted">
                              {item.rowNumber}
                            </td>
                            <td className="px-3 py-2 font-semibold text-text-primary">
                              {item.data.name || "-"}
                            </td>
                            <td className="px-3 py-2 font-mono text-text-primary">
                              {item.data.employeeCode || "-"}
                            </td>
                            <td className="px-3 py-2 text-text-muted">
                              {item.data.department || "-"}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {item.data.level || "-"}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {item.data.country || "-"}
                            </td>
                            <td className="px-3 py-2 font-mono text-text-primary">
                              {item.data.initialSalary ? `${item.data.initialSalary.toLocaleString()} ${item.data.currency}` : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {hasErrors ? (
                                <span
                                  className="text-rose-500 cursor-help underline decoration-dotted"
                                  title={item.errors.join("\n")}
                                >
                                  Invalid
                                </span>
                              ) : (
                                <span className="text-emerald-500 font-medium">Valid</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsBulkUploadOpen(false);
                  setBulkFile(null);
                  setBulkPreview([]);
                  setBulkErrorsCount(0);
                  setBulkImportError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isBulkImporting}
                disabled={bulkPreview.length === 0 || bulkErrorsCount > 0}
              >
                Import Employees
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Custom Alert/Message Dialog */}
      <Modal
        isOpen={errorPopup.isOpen}
        onClose={() => setErrorPopup((prev) => ({ ...prev, isOpen: false }))}
        title={errorPopup.title}
      >
        <div className="flex items-start space-x-3.5 py-2">
          {errorPopup.type === "error" && (
            <div className="bg-rose-500/10 text-rose-500 rounded-full p-2.5 shrink-0">
              <AlertTriangle size={24} />
            </div>
          )}
          {errorPopup.type === "warning" && (
            <div className="bg-amber-500/10 text-amber-500 rounded-full p-2.5 shrink-0">
              <AlertTriangle size={24} />
            </div>
          )}
          {errorPopup.type === "success" && (
            <div className="bg-emerald-500/10 text-emerald-500 rounded-full p-2.5 shrink-0">
              <CheckCircle size={24} />
            </div>
          )}
          {errorPopup.type === "info" && (
            <div className="bg-accent/10 text-accent rounded-full p-2.5 shrink-0">
              <CheckCircle size={24} />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-text-muted text-sm leading-relaxed">
              {errorPopup.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => setErrorPopup((prev) => ({ ...prev, isOpen: false }))}
            className="px-4"
          >
            Acknowledge
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Config mappings for drop options
const LEVELS = ["L1", "L2", "L3", "L4", "L5"];
const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "IN", name: "India", currency: "INR", flag: "🇮🇳" },
  { code: "UK", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { code: "DE", name: "Germany", currency: "EUR", flag: "🇩🇪" },
  { code: "SG", name: "Singapore", currency: "SGD", flag: "🇸🇬" },
  { code: "BR", name: "Brazil", currency: "BRL", flag: "🇧🇷" },
  { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
  { code: "AU", name: "Australia", currency: "AUD", flag: "🇦🇺" },
  { code: "FR", name: "France", currency: "EUR", flag: "🇫🇷" },
  { code: "JP", name: "Japan", currency: "JPY", flag: "🇯🇵" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", flag: "🇦🇪" },
  { code: "NL", name: "Netherlands", currency: "EUR", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", currency: "CHF", flag: "🇨🇭" },
];
