"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Determine active theme on mount
    const root = document.documentElement;
    const isDark =
      root.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    if (isDark) {
      setTheme("dark");
      root.classList.add("dark");
    } else {
      setTheme("light");
      root.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (theme === "dark") {
      setTheme("light");
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      setTheme("dark");
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="bg-surface border-border hover:bg-surface-hover text-text-primary flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-all hover:text-white active:scale-95"
      title={
        theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"
      }
      aria-label="Toggle visual theme"
    >
      {theme === "dark" ? (
        <Sun size={14} className="text-amber-400" />
      ) : (
        <Moon size={14} className="text-indigo-400" />
      )}
    </button>
  );
}
