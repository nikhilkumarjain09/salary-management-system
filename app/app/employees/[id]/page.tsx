"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Briefcase,
  Globe,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ComparisonGauge } from "@/components/ui/ComparisonGauge";

interface SalaryRecord {
  id: string;
  baseAmount: number;
  bonusAmount: number;
  baseAmountUSD: number;
  bonusAmountUSD: number;
  currency: string;
  effectiveDate: string;
}

interface EmployeeDetail {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  level: string;
  country: string;
  isActive: boolean;
  startDate: string;
  manager?: {
    id: string;
    name: string;
    employeeCode: string;
  } | null;
  salaries: SalaryRecord[];
  compaRatio: number | null;
  band?: {
    minAmount: number;
    midAmount: number;
    maxAmount: number;
    currency: string;
  } | null;
  benchmark?: {
    benchmarkAmount: number;
    percentile: number;
    sourceLabel: string;
  } | null;
}

type PageParams = {
  params: Promise<{ id: string }>;
};

export default function EmployeeDetailPage({ params }: PageParams) {
  const router = useRouter();
  const { id } = use(params);

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch employee detail on mount
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/employees/${id}`);
        if (res.ok) {
          const data = await res.json();
          setEmployee(data);
        } else {
          setError("Employee record not found.");
        }
      } catch (err) {
        console.error("Error fetching detail:", err);
        setError("Failed to connect to the server.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col space-y-6 p-6 md:p-12">
        <div className="text-text-muted flex items-center gap-2 text-sm">
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-60 md:col-span-1" />
          <Skeleton className="h-60 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center space-y-4 p-6 text-center md:p-12">
        <AlertTriangle size={48} className="text-destructive mb-2" />
        <h2 className="text-xl font-bold">Error</h2>
        <p className="text-text-muted">
          {error || "Employee record not found."}
        </p>
        <Button onClick={() => router.push("/app/employees")} variant="outline">
          Back to Directory
        </Button>
      </div>
    );
  }

  // Format currency helpers
  const currentSalary = employee.salaries[0] || null;
  const currencySymbol = currentSalary?.currency || "USD";

  const formatCurrency = (val: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Determine Compa-Ratio details
  let compaStatus = "No Band Data";
  let compaColor = "text-text-muted";
  if (employee.compaRatio !== null) {
    const ratio = employee.compaRatio;
    if (ratio < 0.8) {
      compaStatus = "Underpaid (< 80%)";
      compaColor = "text-amber-500";
    } else if (ratio > 1.2) {
      compaStatus = "Premium (> 120%)";
      compaColor = "text-rose-500";
    } else {
      compaStatus = "Market Target (80-120%)";
      compaColor = "text-emerald-500";
    }
  }

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col space-y-8 p-6 md:p-12">
      {/* Header back button */}
      <div>
        <Link
          href="/app/employees"
          className="text-text-muted hover:text-text-primary mb-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Link>
        <PageHeader
          title={employee.name}
          description={`Employee Code: ${employee.employeeCode} • Active: ${
            employee.isActive ? "Yes" : "No"
          }`}
        />
      </div>

      {/* Compensation stat metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Current Base Salary"
          value={
            currentSalary
              ? formatCurrency(currentSalary.baseAmount, currentSalary.currency)
              : "N/A"
          }
          description={
            currentSalary && currentSalary.currency !== "USD"
              ? `Normalized: ${formatCurrency(currentSalary.baseAmountUSD, "USD")}`
              : "Base salary in local currency"
          }
          icon={<TrendingUp size={18} />}
        />

        <StatCard
          title="Compa-Ratio"
          value={
            employee.compaRatio !== null
              ? `${(employee.compaRatio * 100).toFixed(1)}%`
              : "N/A"
          }
          description={compaStatus}
          trend={
            employee.compaRatio !== null
              ? {
                  value: compaStatus,
                  type:
                    employee.compaRatio < 0.8
                      ? "neutral"
                      : employee.compaRatio > 1.2
                        ? "down"
                        : "up",
                }
              : undefined
          }
        />

        <StatCard
          title="Market Benchmark"
          value={
            employee.benchmark
              ? formatCurrency(
                  employee.benchmark.benchmarkAmount,
                  currencySymbol,
                )
              : "N/A"
          }
          description={
            employee.benchmark
              ? `Percentile: P${employee.benchmark.percentile} (${employee.benchmark.sourceLabel})`
              : "No market benchmark found"
          }
          icon={<Globe size={18} />}
        />
      </div>

      {employee.benchmark && currentSalary && (
        <ComparisonGauge
          actual={currentSalary.baseAmount}
          benchmark={employee.benchmark.benchmarkAmount}
          currency={currencySymbol}
          sourceLabel={employee.benchmark.sourceLabel}
          label="Individual Pay vs. Market Rate"
        />
      )}

      {/* Split details layout */}
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
        {/* Profile Card details */}
        <Card className="border-border bg-surface md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <User size={16} className="text-text-muted" />
              <div>
                <p className="text-text-muted text-xs font-semibold uppercase">
                  Name
                </p>
                <p className="text-text-primary font-semibold">
                  {employee.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Briefcase size={16} className="text-text-muted" />
              <div>
                <p className="text-text-muted text-xs font-semibold uppercase">
                  Department & Level
                </p>
                <p className="text-text-primary font-semibold">
                  {employee.department} • {employee.level}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Globe size={16} className="text-text-muted" />
              <div>
                <p className="text-text-muted text-xs font-semibold uppercase">
                  Country Location
                </p>
                <p className="text-text-primary font-semibold">
                  {employee.country}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-text-muted" />
              <div>
                <p className="text-text-muted text-xs font-semibold uppercase">
                  Start Date
                </p>
                <p className="text-text-primary font-semibold">
                  {new Date(employee.startDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="border-border/60 border-t pt-4">
              <p className="text-text-muted text-xs font-semibold uppercase">
                Reporting Manager
              </p>
              {employee.manager ? (
                <div className="mt-1">
                  <p className="text-text-primary font-semibold">
                    {employee.manager.name}
                  </p>
                  <p className="text-text-muted text-xs">
                    Code: {employee.manager.employeeCode}
                  </p>
                </div>
              ) : (
                <p className="text-text-muted mt-0.5 italic">
                  No reporting manager assigned
                </p>
              )}
            </div>

            {employee.band && (
              <div className="border-border/60 border-t pt-4">
                <p className="text-text-muted text-xs font-semibold uppercase">
                  Compensation Band (Midpoint)
                </p>
                <p className="text-text-primary mt-0.5 font-semibold">
                  {formatCurrency(
                    employee.band.midAmount,
                    employee.band.currency,
                  )}
                </p>
                <p className="text-text-muted text-xs">
                  Range:{" "}
                  {formatCurrency(
                    employee.band.minAmount,
                    employee.band.currency,
                  )}{" "}
                  –{" "}
                  {formatCurrency(
                    employee.band.maxAmount,
                    employee.band.currency,
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary History timeline */}
        <Card className="border-border bg-surface md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Salary History Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employee.salaries.length === 0 ? (
              <div className="text-text-muted py-8 text-center italic">
                No salary histories recorded.
              </div>
            ) : (
              <div className="border-border relative ml-2 space-y-8 border-l pl-6">
                {employee.salaries.map((sal, index) => {
                  // Calculate raise progression
                  let raiseAmount = 0;
                  let raisePercent = 0;
                  const previousSal = employee.salaries[index + 1]; // next in array since they are ordered desc

                  if (previousSal) {
                    raiseAmount = sal.baseAmount - previousSal.baseAmount;
                    raisePercent = (raiseAmount / previousSal.baseAmount) * 100;
                  }

                  const formattedDate = new Date(
                    sal.effectiveDate,
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });

                  return (
                    <div key={sal.id} className="relative">
                      {/* Timeline dot marker */}
                      <span className="border-border bg-surface absolute top-1.5 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border">
                        <span className="bg-accent h-1.5 w-1.5 rounded-full" />
                      </span>

                      <div className="space-y-1.5">
                        <span className="text-text-muted inline-block text-xs font-semibold tracking-wider uppercase">
                          {formattedDate}
                        </span>

                        <div className="bg-background/30 border-border/30 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-text-primary text-base font-bold">
                              {formatCurrency(sal.baseAmount, sal.currency)}
                            </p>
                            {sal.currency !== "USD" && (
                              <p className="text-text-muted text-xs">
                                USD equivalent:{" "}
                                {formatCurrency(sal.baseAmountUSD, "USD")}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            {previousSal ? (
                              <span
                                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                                  raiseAmount >= 0
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-rose-500/10 text-rose-500"
                                }`}
                              >
                                {raiseAmount >= 0 ? "+" : ""}
                                {formatCurrency(raiseAmount, sal.currency)} (
                                {raisePercent.toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="bg-accent/10 text-accent inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold">
                                Starting Salary
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
