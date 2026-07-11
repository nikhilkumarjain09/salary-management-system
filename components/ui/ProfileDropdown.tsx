"use client";

import React, { useState, useRef, useEffect } from "react";
import { LogOut, Shield, ChevronDown } from "lucide-react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-surface-hover/80 flex cursor-pointer items-center gap-1.5 rounded-full p-1 transition-colors focus:outline-none"
        aria-label="User profile menu"
      >
        <div className="bg-accent flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm select-none">
          {initials}
        </div>
        <ChevronDown size={14} className="text-text-muted hidden sm:inline" />
      </button>

      {isOpen && (
        <div className="bg-surface border-border animate-in fade-in-50 slide-in-from-top-1 absolute right-0 z-50 mt-2 w-56 rounded-lg border p-2 shadow-xl duration-100">
          <div className="border-border/40 mb-1.5 border-b px-3 py-2">
            <p className="text-text-primary truncate text-sm font-semibold">
              {email}
            </p>
            <div className="text-text-muted mt-0.5 flex items-center gap-1 text-xs">
              <Shield size={12} className="text-accent" />
              <span>HR Administrator</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
