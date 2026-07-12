import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 28 }: LogoProps) {
  return (
    <div
      className={`text-text-primary flex items-center gap-2 font-semibold tracking-tight ${className}`}
    >
      <img
        src="/assets/salary-management-system.png"
        alt="CompensaIQ Logo"
        width={size}
        height={size}
        className="rounded-md object-contain select-none"
      />
      <span className="text-lg font-bold tracking-tight">CompensaIQ</span>
    </div>
  );
}