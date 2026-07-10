"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!position || !menuRef.current) {
      setAdjusted(null);
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    setAdjusted({ x, y });
  }, [position]);

  // Close on outside click
  useEffect(() => {
    if (!position) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [position, onClose]);

  if (!position) return null;

  const displayPos = adjusted || position;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="border-border bg-surface fixed z-[60] min-w-[180px] rounded-lg border p-1 shadow-xl"
        style={{ left: displayPos.x, top: displayPos.y }}
      >
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            {item.separator && <div className="border-border my-1 border-t" />}
            <button
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={item.disabled}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                item.variant === "destructive"
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-text-primary hover:bg-surface-hover"
              } ${item.disabled ? "pointer-events-none opacity-40" : ""}`}
            >
              {item.icon && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
