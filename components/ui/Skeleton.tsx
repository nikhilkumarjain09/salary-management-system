import React, { HTMLAttributes } from "react";

export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface-hover animate-pulse rounded ${className}`}
      {...props}
    />
  );
}
