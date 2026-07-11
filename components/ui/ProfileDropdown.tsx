"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User,
  Settings,
  Sun,
  Moon,
  Check,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface ProfileDropdownProps {
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"main" | "theme">("main");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme on mount
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      root.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    setTheme(isDark ? "dark" : "light");
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveMenu("main"); // Reset menu on close
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const email = user?.email || "hr.manager@acme.com";
  const initials = email.substring(0, 2).toUpperCase();

  const handleSignOut = () => {
    setIsOpen(false);
    signOut({ redirectTo: "/login" });
  };

  const handleSelectTheme = (selectedTheme: "light" | "dark") => {
    setTheme(selectedTheme);
    const root = document.documentElement;
    if (selectedTheme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setActiveMenu("main");
        }}
        className="flex items-center gap-1.5 rounded-full p-1 hover:bg-surface-hover/80 transition-colors focus:outline-none cursor-pointer"
        aria-label="User profile menu"
      >
        <div className="bg-accent text-white flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm select-none">
          {initials}
        </div>
        <ChevronDown size={14} className="text-text-muted hidden sm:inline" />
      </button>

      {isOpen && (
        <div className="bg-surface border-border absolute right-0 mt-2 w-56 rounded-lg border shadow-xl z-50 p-2 animate-in fade-in-50 slide-in-from-top-1 duration-100">
          {activeMenu === "main" ? (
            <>
              {/* Profile details */}
              <div className="px-3 py-2 border-b border-border/40 mb-1.5">
                <p className="text-text-primary text-sm font-semibold truncate">
                  {email}
                </p>
                <div className="flex items-center gap-1 mt-0.5 text-text-muted text-xs">
                  <Shield size={12} className="text-accent" />
                  <span>HR Administrator</span>
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-0.5">
                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer">
                  <User size={14} className="text-text-muted" />
                  <span>Account Settings</span>
                </button>

                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer">
                  <Settings size={14} className="text-text-muted" />
                  <span>API Settings</span>
                </button>

                <button
                  onClick={() => setActiveMenu("theme")}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {theme === "light" ? (
                      <Sun size={14} className="text-amber-500" />
                    ) : (
                      <Moon size={14} className="text-indigo-400" />
                    )}
                    <span>Display Theme</span>
                  </div>
                  <ChevronRight size={14} className="text-text-muted" />
                </button>
              </div>

              <div className="border-t border-border/40 my-1.5" />

              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Back to main button */}
              <button
                onClick={() => setActiveMenu("main")}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary rounded-md mb-2 font-bold cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Select Theme
              </div>

              {/* Theme selections */}
              <div className="space-y-0.5">
                <button
                  onClick={() => handleSelectTheme("light")}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sun size={14} className="text-amber-500" />
                    <span>Light Mode</span>
                  </div>
                  {theme === "light" && (
                    <Check size={14} className="text-accent" />
                  )}
                </button>

                <button
                  onClick={() => handleSelectTheme("dark")}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Moon size={14} className="text-indigo-400" />
                    <span>Dark Mode</span>
                  </div>
                  {theme === "dark" && (
                    <Check size={14} className="text-accent" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
