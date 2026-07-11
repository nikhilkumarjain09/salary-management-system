"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Sliders,
  TrendingUp,
  GitFork,
  FileSpreadsheet,
  History,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "../logo";

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  setIsCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Preference load and redirect
  useEffect(() => {
    try {
      const lastPage = localStorage.getItem("lastPage");
      const redirected = sessionStorage.getItem("redirectedToLastPage");
      // Check if user landed on home root of app and wants to restore last opened page
      if (
        pathname === "/app" &&
        lastPage &&
        lastPage !== "/app" &&
        !redirected
      ) {
        sessionStorage.setItem("redirectedToLastPage", "true");
        router.push(lastPage);
      }
    } catch (e) {
      console.warn("Failed to load lastPage preference:", e);
    }
  }, [pathname, router]);

  // Track active page changes
  useEffect(() => {
    try {
      if (pathname && pathname.startsWith("/app")) {
        localStorage.setItem("lastPage", pathname);
      }
    } catch (e) {
      console.warn("Failed to save lastPage preference:", e);
    }
  }, [pathname]);

  const navGroups = [
    {
      title: "Main",
      items: [
        {
          label: "Home",
          href: "/app",
          icon: <Home size={18} />,
        },
      ],
    },
    {
      title: "People & Ops",
      items: [
        {
          label: "Employee Directory",
          href: "/app/employees",
          icon: <Users size={18} />,
        },
        {
          label: "Org Chart",
          href: "/app/org-chart",
          icon: <GitFork size={18} />,
        },
      ],
    },
    {
      title: "Compensation Strategy",
      items: [
        {
          label: "Pay Bands",
          href: "/app/compensation-bands",
          icon: <Sliders size={18} />,
        },
        {
          label: "Benchmarking",
          href: "/app/benchmarking",
          icon: <TrendingUp size={18} />,
        },
      ],
    },
    {
      title: "Intelligence & Audit",
      items: [
        {
          label: "Reports Builder",
          href: "/app/reports",
          icon: <FileSpreadsheet size={18} />,
        },
        {
          label: "Audit Logs",
          href: "/app/audit-log",
          icon: <History size={18} />,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-3.5">
      <div className="space-y-6">
        {/* Brand header */}
        <div className="border-border/40 flex items-center justify-between border-b pb-2.5 min-h-[38px] overflow-hidden px-1">
          <div className="flex items-center overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="CompensaIQ Logo"
              className="h-6 w-6 rounded-md object-contain shrink-0 select-none"
            />
            <span className={`text-sm font-bold tracking-tight text-text-primary transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isCollapsed ? "max-w-0 opacity-0 ml-0 pointer-events-none" : "max-w-[150px] opacity-100 ml-2"}`}>
              CompensaIQ
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className={`text-text-muted hover:text-text-primary hover:bg-surface-hover hidden rounded p-1 transition-all duration-300 ease-in-out md:block cursor-pointer shrink-0 ${isCollapsed ? "opacity-0 scale-90 w-0 h-0 pointer-events-none p-0" : "opacity-100 w-auto h-auto"}`}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-5">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <span className={`text-text-muted px-2.5 text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap block ${isCollapsed ? "max-h-0 opacity-0 mb-0 pointer-events-none" : "max-h-[20px] opacity-100 mb-1"}`}>
                {group.title}
              </span>
              <div className="space-y-0.5">
                {group.items.map((item, iIdx) => {
                  const isActive =
                    item.href === "/app"
                      ? pathname === "/app"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={iIdx}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`relative group flex items-center rounded-lg px-2.5 py-2.5 text-xs font-semibold transition-all duration-300 ease-in-out ${
                        isActive
                          ? "bg-accent/10 text-accent font-bold"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-hover/60"
                      } gap-3`}
                    >
                      <span
                        className={`transition-colors duration-200 shrink-0 w-5 h-5 flex items-center justify-center ${isActive ? "text-accent" : "text-text-muted"}`}
                      >
                        {item.icon}
                      </span>
                      <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isCollapsed ? "max-w-0 opacity-0 pointer-events-none ml-0" : "max-w-[160px] opacity-100 ml-1"}`}>
                        {item.label}
                      </span>
                      {isCollapsed && (
                        <span className="absolute left-full ml-4 px-2 py-1.5 rounded bg-surface border border-border text-[10px] font-bold text-text-primary whitespace-nowrap shadow-xl opacity-0 scale-95 origin-left group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none z-50">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className={`text-text-muted border-border/40 border-t pt-3 text-center text-[10px] select-none transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap px-1 ${isCollapsed ? "max-h-0 opacity-0 border-t-0 pointer-events-none py-0 mt-0" : "max-h-[30px] opacity-100 py-1.5 mt-3"}`}>
        CompensaIQ v1.0.0
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Persistent left panel) */}
      <aside
        className={`bg-surface border-border fixed top-0 bottom-0 left-0 z-30 hidden border-r transition-all duration-200 md:block ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-over panel) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer container */}
          <aside className="bg-surface border-border animate-in slide-in-from-left relative z-50 flex h-full w-64 flex-col border-r duration-200">
            <button
              onClick={onCloseMobile}
              className="text-text-muted hover:text-text-primary hover:bg-surface-hover absolute top-4 right-4 rounded p-1 transition-colors"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
