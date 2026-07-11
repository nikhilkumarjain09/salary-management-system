"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  User,
  Settings,
  Sun,
  Moon,
  Check,
  Lock,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Modal } from "./Modal";

interface ProfileDropdownProps {
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal Open States
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

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
        setIsThemeOpen(false); // Reset theme flyout on close
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const email = user?.email || "hr.manager@acme.com";
  const initials = email.substring(0, 2).toUpperCase();

  const handleSignOut = () => {
    setIsOpen(false);
    setIsThemeOpen(false);
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
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsThemeOpen(false); // Close theme flyout on toggle
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
              <button
                onClick={() => {
                  setIsAccountOpen(true);
                  setIsOpen(false);
                  setIsThemeOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
              >
                <User size={14} className="text-text-muted" />
                <span>Account Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsSecurityOpen(true);
                  setIsOpen(false);
                  setIsThemeOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
              >
                <Lock size={14} className="text-text-muted" />
                <span>Security & Password</span>
              </button>

              <button
                onClick={() => {
                  setIsPreferencesOpen(true);
                  setIsOpen(false);
                  setIsThemeOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
              >
                <Settings size={14} className="text-text-muted" />
                <span>System Preferences</span>
              </button>

              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs rounded-md transition-colors cursor-pointer ${
                  isThemeOpen
                    ? "bg-surface-hover text-text-primary"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }`}
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

            {/* Side flyout sub-menu for theme (opens left side-by-side) */}
            {isThemeOpen && (
              <div className="bg-surface border-border absolute right-full mr-2 top-0 w-44 rounded-lg border shadow-xl z-50 p-2 animate-in fade-in-50 slide-in-from-right-1 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                  Select Theme
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => handleSelectTheme("light")}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sun size={14} className="text-amber-500" />
                      <span>Light Mode</span>
                    </div>
                    {theme === "light" && (
                      <Check size={12} className="text-accent" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSelectTheme("dark")}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Moon size={14} className="text-indigo-400" />
                      <span>Dark Mode</span>
                    </div>
                    {theme === "dark" && (
                      <Check size={12} className="text-accent" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Settings Popup */}
      <Modal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        title="Account Settings"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              defaultValue="Admin User"
              className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-background/50 border border-border/60 text-text-muted rounded-lg px-3 py-2 text-sm cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Role Profile
            </label>
            <input
              type="text"
              value="HR Administrator"
              disabled
              className="w-full bg-background/50 border border-border/60 text-text-muted rounded-lg px-3 py-2 text-sm cursor-not-allowed"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <button
              onClick={() => setIsAccountOpen(false)}
              className="bg-surface hover:bg-surface-hover border border-border text-text-primary px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsAccountOpen(false)}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Security & Password Popup */}
      <Modal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        title="Security & Password"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Confirm password"
              className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>
          <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Two-Factor Authentication (2FA)
              </p>
              <p className="text-[10px] text-text-muted">
                Secure your account with multi-factor verification check-ins.
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-accent focus:ring-accent rounded border-border"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <button
              onClick={() => setIsSecurityOpen(false)}
              className="bg-surface hover:bg-surface-hover border border-border text-text-primary px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsSecurityOpen(false)}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Update Password
            </button>
          </div>
        </div>
      </Modal>

      {/* System Preferences Popup */}
      <Modal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        title="System Preferences"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Default Landing Page
            </label>
            <select className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all">
              <option value="/app">Home Dashboard</option>
              <option value="/app/employees">Employee Directory</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Primary Currency
            </label>
            <select className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all">
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Desktop Notifications
              </p>
              <p className="text-[10px] text-text-muted">
                Receive alerts on critical pay-band adjustments.
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-accent focus:ring-accent rounded border-border"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <button
              onClick={() => setIsPreferencesOpen(false)}
              className="bg-surface hover:bg-surface-hover border border-border text-text-primary px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsPreferencesOpen(false)}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
