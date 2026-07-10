import React, { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`border-border bg-surface/30 flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center md:p-12 ${className}`}
    >
      {icon && (
        <div className="bg-surface text-text-muted border-border mb-4 flex h-12 w-12 items-center justify-center rounded-full border">
          {icon}
        </div>
      )}
      <h3 className="text-text-primary mb-1 text-lg font-medium">{title}</h3>
      <p className="text-text-muted mb-6 max-w-sm text-sm">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
