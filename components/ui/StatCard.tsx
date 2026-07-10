import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    type: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-text-muted text-sm font-semibold tracking-wider uppercase">
          {title}
        </CardTitle>
        {icon && <div className="text-text-muted shrink-0">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-text-primary mb-1 text-2xl font-bold tracking-tight">
          {value}
        </div>
        {(description || trend) && (
          <div className="text-text-muted flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className={
                  trend.type === "up"
                    ? "font-medium text-emerald-500"
                    : trend.type === "down"
                      ? "font-medium text-rose-500"
                      : "text-text-muted"
                }
              >
                {trend.value}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
