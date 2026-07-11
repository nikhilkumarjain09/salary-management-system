"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option",
  icon,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-background border-border text-text-primary hover:bg-surface-hover/50 flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-accent/50 focus:border-accent focus:outline-none"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon || icon}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.08 }}
            className="bg-surface border-border absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-lg border p-1 shadow-xl no-scrollbar animate-in"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "text-accent bg-accent/5 font-bold"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Check size={12} className="text-accent" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
