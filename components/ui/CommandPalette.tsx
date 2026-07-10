"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Users,
  ArrowRight,
  FileText,
  Layers,
  BarChart2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface CommandPaletteCtx {
  open: () => void;
}
const PaletteContext = createContext<CommandPaletteCtx>({ open: () => {} });
export const useCommandPalette = () => useContext(PaletteContext);

/* ------------------------------------------------------------------ */
/*  Result types                                                      */
/* ------------------------------------------------------------------ */

interface EmployeeResult {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  level: string;
}

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  section: string;
  onSelect: () => void;
}

/* ------------------------------------------------------------------ */
/*  Static page items                                                 */
/* ------------------------------------------------------------------ */

const PAGE_SECTION = "Pages";

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);

  // Global Cmd/Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PaletteContext.Provider value={{ open: openPalette }}>
      {children}
      {typeof window !== "undefined" &&
        createPortal(
          <CommandPaletteInner isOpen={isOpen} onClose={closePalette} />,
          document.body,
        )}
    </PaletteContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner palette                                                     */
/* ------------------------------------------------------------------ */

function CommandPaletteInner({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Static page items (stable across renders)
  const pageItems: PaletteItem[] = [
    {
      id: "page-dashboard",
      label: "Dashboard",
      sublabel: "/app",
      icon: <LayoutDashboard size={16} />,
      section: PAGE_SECTION,
      onSelect: () => {
        router.push("/app");
        onClose();
      },
    },
    {
      id: "page-directory",
      label: "Employee Directory",
      sublabel: "/app/employees",
      icon: <Users size={16} />,
      section: PAGE_SECTION,
      onSelect: () => {
        router.push("/app/employees");
        onClose();
      },
    },
    {
      id: "page-audit-log",
      label: "Audit Log",
      sublabel: "/app/audit-log",
      icon: <FileText size={16} />,
      section: PAGE_SECTION,
      onSelect: () => {
        router.push("/app/audit-log");
        onClose();
      },
    },
    {
      id: "page-compensation-bands",
      label: "Compensation Bands",
      sublabel: "/app/compensation-bands",
      icon: <Layers size={16} />,
      section: PAGE_SECTION,
      onSelect: () => {
        router.push("/app/compensation-bands");
        onClose();
      },
    },
    {
      id: "page-benchmarking",
      label: "Market Benchmarking",
      sublabel: "/app/benchmarking",
      icon: <BarChart2 size={16} />,
      section: PAGE_SECTION,
      onSelect: () => {
        router.push("/app/benchmarking");
        onClose();
      },
    },
  ];

  // Employee result items
  const employeeItems: PaletteItem[] = employees.map((emp) => ({
    id: `emp-${emp.id}`,
    label: emp.name,
    sublabel: `${emp.employeeCode} - ${emp.department} - ${emp.level}`,
    icon: <ArrowRight size={16} />,
    section: "Employees",
    onSelect: () => {
      router.push(`/app/employees/${emp.id}`);
      onClose();
    },
  }));

  const allItems = query.trim()
    ? [...employeeItems, ...pageItems]
    : [...pageItems];

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setEmployees([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/employees?query=${encodeURIComponent(query.trim())}&limit=8`,
        );
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
        }
      } catch {
        // Silently fail — search is best-effort in palette
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setEmployees([]);
      setActiveIndex(0);
      // Focus input after portal mount
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          allItems.length === 0 ? 0 : (prev + 1) % allItems.length,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          allItems.length === 0
            ? 0
            : (prev - 1 + allItems.length) % allItems.length,
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (allItems[activeIndex]) {
          allItems[activeIndex].onSelect();
        }
        return;
      }
    },
    [allItems, activeIndex, onClose],
  );

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(0);
  }, [employees.length, query]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Group items by section for rendering
  const sections = allItems.reduce<Record<string, PaletteItem[]>>(
    (acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    },
    {},
  );

  // Flat index tracker
  let flatIdx = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex justify-center p-4"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="border-border bg-surface relative z-10 mt-[15vh] flex h-fit max-h-[60vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            {/* Search Input */}
            <div className="border-border flex items-center gap-3 border-b px-4 py-3">
              <Search size={18} className="text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search employees, pages, or actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-text-primary placeholder:text-text-muted/50 w-full bg-transparent text-base focus:outline-none"
              />
              <kbd className="text-text-muted border-border hidden rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-2">
              {isSearching && (
                <p className="text-text-muted px-3 py-4 text-center text-sm">
                  Searching...
                </p>
              )}

              {!isSearching && query.trim() && employeeItems.length === 0 && (
                <p className="text-text-muted px-3 py-4 text-center text-sm">
                  No employees found for &quot;{query}&quot;
                </p>
              )}

              {Object.entries(sections).map(([section, sectionItems]) => (
                <div key={section} className="mb-2">
                  <p className="text-text-muted px-3 py-2 text-xs font-semibold tracking-wider uppercase">
                    {section}
                  </p>
                  {sectionItems.map((item) => {
                    const itemIdx = flatIdx++;
                    return (
                      <button
                        key={item.id}
                        onClick={item.onSelect}
                        onMouseEnter={() => setActiveIndex(itemIdx)}
                        className={`text-text-primary flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                          activeIndex === itemIdx
                            ? "bg-surface-hover"
                            : "hover:bg-surface-hover/50"
                        }`}
                      >
                        <span className="text-text-muted flex h-4 w-4 shrink-0 items-center justify-center">
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-text-muted truncate text-xs">
                            {item.sublabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="border-border text-text-muted flex items-center gap-4 border-t px-4 py-2 text-xs">
              <span>
                <kbd className="border-border mr-1 rounded border px-1 py-0.5 text-[10px]">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span>
                <kbd className="border-border mr-1 rounded border px-1 py-0.5 text-[10px]">
                  ↵
                </kbd>
                Select
              </span>
              <span>
                <kbd className="border-border mr-1 rounded border px-1 py-0.5 text-[10px]">
                  Esc
                </kbd>
                Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
