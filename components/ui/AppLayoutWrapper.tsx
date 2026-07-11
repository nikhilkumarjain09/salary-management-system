"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ProfileDropdown } from "./ProfileDropdown";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

interface AppLayoutWrapperProps {
  session: any;
  children: React.ReactNode;
}

export function AppLayoutWrapper({ session, children }: AppLayoutWrapperProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-background text-text-primary flex min-h-screen transition-colors duration-200">
      {/* Sidebar Panel */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Right Column Layout */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-200 ${
          isCollapsed ? "md:pl-16" : "md:pl-64"
        }`}
      >
        {/* Top Header Navigation */}
        <header className="border-border bg-surface sticky top-0 z-40 border-b">
          <div className="flex h-12 items-center justify-between px-6 py-2 md:px-8">
            <div className="flex items-center gap-3">
              {/* Menu button on mobile */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="text-text-muted hover:text-text-primary hover:bg-surface-hover block cursor-pointer rounded p-1 transition-colors md:hidden"
                aria-label="Open sidebar menu"
              >
                <Menu size={18} />
              </button>

              {/* Sidebar toggle button on desktop (only when collapsed) */}
              {isCollapsed && (
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="text-text-muted hover:text-text-primary hover:bg-surface-hover hidden cursor-pointer rounded p-1 transition-colors md:block"
                  title="Expand Sidebar"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              <span className="text-text-muted hidden text-xs font-semibold select-none md:inline">
                CompensaIQ Admin Portal
              </span>
            </div>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-4">
              {session.user && <ProfileDropdown user={session.user} />}
            </div>
          </div>
        </header>

        {/* Inner Content Body */}
        <main className="w-full flex-1">{children}</main>
      </div>
    </div>
  );
}
