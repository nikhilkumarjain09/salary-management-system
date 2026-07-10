"use client";
import React from "react";
import { AlertCircle } from "lucide-react";

interface ComparisonGaugeProps {
  actual: number;
  benchmark: number;
  currency: string;
  label?: string;
  sourceLabel?: string;
  className?: string;
}

export function ComparisonGauge({
  actual,
  benchmark,
  currency,
  label = "Actual vs. Market Benchmark",
  sourceLabel = "Seeded illustrative data — not a live market feed",
  className = "",
}: ComparisonGaugeProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const ratio = benchmark > 0 ? actual / benchmark : 0;
  const percentOfMarket = Number((ratio * 100).toFixed(1));

  // Determine colors and messages
  let barColor = "bg-emerald-500";
  let statusText = "Aligns with Market";
  let statusColor = "text-emerald-500 bg-emerald-500/10";

  if (ratio < 0.85) {
    barColor = "bg-amber-500";
    statusText = "Below Market (< 85%)";
    statusColor = "text-amber-500 bg-amber-500/10";
  } else if (ratio > 1.15) {
    barColor = "bg-rose-500";
    statusText = "Above Market (> 115%)";
    statusColor = "text-rose-500 bg-rose-500/10";
  }

  // Cap ratio between 0.3 and 1.7 for visualization purposes
  const sliderPos = Math.max(
    0,
    Math.min(100, ((ratio - 0.3) / (1.7 - 0.3)) * 100),
  );

  return (
    <div
      className={`border-border bg-background/40 space-y-4 rounded-xl border p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-text-primary text-sm font-semibold">{label}</h4>
        {actual > 0 && (
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${statusColor}`}
          >
            {statusText}
          </span>
        )}
      </div>

      {actual === 0 ? (
        <div className="text-text-muted flex items-center justify-center py-6 text-sm italic">
          No payroll data available for comparison
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bar gauge */}
          <div className="space-y-1">
            <div className="bg-surface relative h-6 w-full rounded-lg">
              {/* Tick markers */}
              <div className="text-text-muted/40 pointer-events-none absolute inset-0 flex justify-between px-2 font-mono text-[9px] select-none">
                <span className="self-center">30%</span>
                <span className="border-border h-3 self-center border-l"></span>
                <span className="text-text-muted/60 self-center font-bold">
                  100% (Market)
                </span>
                <span className="border-border h-3 self-center border-l"></span>
                <span className="self-center">170%</span>
              </div>

              {/* Center 100% marker line */}
              <div className="border-text-muted/30 pointer-events-none absolute top-0 bottom-0 left-[50%] border-l border-dashed"></div>

              {/* Slider thumb representation */}
              <div
                className="absolute top-1 bottom-1 w-2.5 rounded-full shadow-lg transition-all duration-300"
                style={{
                  left: `calc(${sliderPos}% - 5px)`,
                  backgroundColor: `var(--color-accent, #6366f1)`,
                }}
              />

              {/* Filled progress bar representing ratio */}
              <div
                className={`absolute bottom-0 left-0 h-1.5 rounded-full transition-all duration-300 ${barColor}`}
                style={{
                  width: `${Math.min(100, (actual / benchmark) * 50)}%`,
                }}
              />
            </div>
          </div>

          {/* Detailed stats */}
          <div className="grid grid-cols-2 gap-4 pt-1 text-sm">
            <div className="border-border border-r pr-4">
              <span className="text-text-muted block text-xs">Actual Pay</span>
              <span className="text-text-primary text-base font-bold">
                {formatCurrency(actual)}
              </span>
            </div>
            <div>
              <span className="text-text-muted block text-xs">Market Pay</span>
              <span className="text-text-primary text-base font-bold">
                {formatCurrency(benchmark)}
              </span>
            </div>
          </div>

          <div className="text-text-muted flex items-center gap-1.5 text-xs">
            <span className="text-text-primary font-bold">
              {percentOfMarket}%
            </span>
            <span>of market benchmark rate</span>
          </div>
        </div>
      )}

      {/* Visibly display the required sourceLabel warning */}
      <div className="border-border/60 text-text-muted/80 flex items-center gap-1.5 border-t pt-3 text-[11px] font-medium italic">
        <AlertCircle size={12} className="text-text-muted/65 shrink-0" />
        <span>Source: {sourceLabel}</span>
      </div>
    </div>
  );
}
