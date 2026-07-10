"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onDeselectAll: () => void;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onDeselectAll,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed right-0 bottom-0 left-0 z-40"
        >
          <div className="border-border bg-surface border-t shadow-2xl">
            <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-text-primary text-sm font-medium">
                  {selectedCount} employee{selectedCount !== 1 ? "s" : ""}{" "}
                  selected
                </span>
                <button
                  onClick={onDeselectAll}
                  className="text-text-muted hover:text-text-primary flex items-center gap-1 text-xs transition-colors"
                >
                  <X size={12} />
                  <span>Deselect All</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {actions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant={
                      action.variant === "destructive"
                        ? "destructive"
                        : "secondary"
                    }
                    size="sm"
                    onClick={action.onClick}
                  >
                    {action.icon && (
                      <span className="mr-1.5 flex items-center">
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
