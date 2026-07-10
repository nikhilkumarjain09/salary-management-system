import React, { InputHTMLAttributes } from "react";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  className?: string;
}

export function FormField({
  label,
  error,
  className = "",
  id,
  ...props
}: FormFieldProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="text-text-muted text-xs font-semibold tracking-wider uppercase"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`bg-background text-text-primary placeholder:text-text-muted/50 focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:outline-none ${
          error
            ? "border-destructive focus:ring-destructive/50 focus:border-destructive"
            : "border-border hover:border-border/80"
        }`}
        {...props}
      />
      {error && (
        <p className="text-destructive mt-1 text-xs font-medium">{error}</p>
      )}
    </div>
  );
}
