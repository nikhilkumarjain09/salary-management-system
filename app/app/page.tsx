"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  Activity,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PayQueryBox } from "@/components/ui/PayQueryBox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

interface DeptStat {
  department: string;
  average: number;
  median: number;
}

interface CountryStat {
  country: string;
  average: number;
  median: number;
}

interface MonthTrend {
  month: string;
  headcount: number;
  costUSD: number;
}

interface EquityStat {
  department: string;
  level: string;
  minPayUSD: number;
  maxPayUSD: number;
  spreadUSD: number;
  ratio: number;
  flagged: boolean;
}

interface AnalyticsData {
  headcount: number;
  totalMonthlyCostUSD: number;
  averageCompaRatio: number;
  departmentStats: DeptStat[];
  countryStats: CountryStat[];
  monthlyTrend: MonthTrend[];
  payEquity: EquityStat[];
}

export default function HomeDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        } else {
          setError("Failed to load analytics aggregates.");
        }
      } catch (err) {
        console.error("Error loading analytics:", err);
        setError("Failed to connect to the server.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-background text-text-primary mx-auto flex w-full max-w-7xl flex-col space-y-8 p-6 md:p-12">
      <PageHeader
        title="Home"
        description="Welcome to CompensaIQ. Search using natural language, explore departments, audit pay bands, and track key metrics."
      />

      {/* Natural Language Query Box */}
      <PayQueryBox />

      {/* Analytics Loader / Dashboard Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error || !data ? (
        <div className="bg-surface border-border flex flex-col items-center justify-center rounded-lg border p-6 text-center">
          <AlertTriangle className="mb-2 h-8 w-8 text-rose-500" />
          <span className="text-text-primary text-sm font-semibold">
            Unable to display live metrics
          </span>
          <span className="text-text-muted mt-1 text-xs">
            {error || "Aggregation data missing"}
          </span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Headline Metric StatCards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Active Headcount"
              value={data.headcount.toLocaleString()}
              description="Total active ACME payroll personnel"
              icon={<Users size={18} />}
            />
            <StatCard
              title="Monthly Payroll Cost (USD)"
              value={formatUSD(data.totalMonthlyCostUSD)}
              description="Aggregated monthly base + bonus rates"
              icon={<DollarSign size={18} />}
            />
            <StatCard
              title="Average Compa-Ratio"
              value={`${data.averageCompaRatio}%`}
              description="Average deviation from compensation band midpoints"
              icon={<TrendingUp size={18} />}
            />
          </div>

          {/* Pay by Department & Country Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Department Pay Chart */}
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Average vs. Median Pay by Department
                </CardTitle>
                <CardDescription className="text-text-muted text-xs">
                  Normalized in USD equivalents
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.departmentStats}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="department"
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background, #0a0a0a)",
                        borderColor: "var(--border, #27272a)",
                        borderRadius: "8px",
                      }}
                      formatter={(v) => [formatUSD(v as number), ""]}
                    />
                    <Legend />
                    <Bar
                      dataKey="average"
                      name="Average Salary"
                      fill="var(--color-accent, #6366f1)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="median"
                      name="Median Salary"
                      fill="rgba(99, 102, 241, 0.4)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Country Pay Chart */}
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Average vs. Median Pay by Country
                </CardTitle>
                <CardDescription className="text-text-muted text-xs">
                  Normalized in USD equivalents
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.countryStats}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="country"
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background, #0a0a0a)",
                        borderColor: "var(--border, #27272a)",
                        borderRadius: "8px",
                      }}
                      formatter={(v) => [formatUSD(v as number), ""]}
                    />
                    <Legend />
                    <Bar
                      dataKey="average"
                      name="Average Salary"
                      fill="var(--color-accent, #6366f1)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="median"
                      name="Median Salary"
                      fill="rgba(99, 102, 241, 0.4)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Headcount Cost Trend and Pay Equity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Headcount & Cost Trend */}
            <Card className="border-border bg-surface lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-bold">
                  Headcount & Cost Trend
                </CardTitle>
                <CardDescription className="text-text-muted text-xs">
                  Monthly costs (USD) over the last 12 months
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrend}>
                    <defs>
                      <linearGradient
                        id="colorCost"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-accent, #6366f1)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-accent, #6366f1)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background, #0a0a0a)",
                        borderColor: "var(--border, #27272a)",
                        borderRadius: "8px",
                      }}
                      formatter={(value, name) => [
                        name === "Monthly Cost"
                          ? formatUSD(value as number)
                          : value,
                        name,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="costUSD"
                      name="Monthly Cost"
                      stroke="var(--color-accent, #6366f1)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCost)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pay Equity Spread View */}
            <Card className="border-border bg-surface overflow-hidden lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      Pay Equity Outlier Report
                    </CardTitle>
                    <CardDescription className="text-text-muted text-xs">
                      Spread of average pays (highest vs. lowest country
                      average) within the same role + level
                    </CardDescription>
                  </div>
                  <span className="text-text-muted border-border bg-background flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase">
                    <Activity size={10} className="text-accent animate-pulse" />
                    Live Analysis
                  </span>
                </div>
              </CardHeader>
              <CardContent className="max-h-[320px] overflow-y-auto p-0">
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-border bg-background/50 border-b">
                        <th className="text-text-muted px-4 py-3 font-semibold tracking-wider uppercase">
                          Role / Group
                        </th>
                        <th className="text-text-muted px-4 py-3 font-semibold tracking-wider uppercase">
                          Level
                        </th>
                        <th className="text-text-muted px-4 py-3 font-semibold tracking-wider uppercase">
                          Pay Range (USD)
                        </th>
                        <th className="text-text-muted px-4 py-3 font-semibold tracking-wider uppercase">
                          Spread
                        </th>
                        <th className="text-text-muted px-4 py-3 font-semibold tracking-wider uppercase">
                          Ratio Spread
                        </th>
                        <th className="text-text-muted px-4 py-3 text-right font-semibold tracking-wider uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payEquity.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-border/30 hover:bg-background/25 border-b transition-colors"
                        >
                          <td className="text-text-primary px-4 py-3 font-medium">
                            {item.department}
                          </td>
                          <td className="text-text-primary px-4 py-3 font-mono">
                            {item.level}
                          </td>
                          <td className="text-text-muted px-4 py-3 font-mono">
                            {formatUSD(item.minPayUSD)} -{" "}
                            {formatUSD(item.maxPayUSD)}
                          </td>
                          <td className="text-text-muted px-4 py-3 font-mono">
                            {formatUSD(item.spreadUSD)}
                          </td>
                          <td className="text-text-primary px-4 py-3 font-mono font-semibold">
                            {item.ratio}x
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.flagged ? (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                                <AlertTriangle size={10} />
                                Gap &gt; 25%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                                <CheckCircle size={10} />
                                Compliant
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Navigational Quick Links Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Employee Directory
            </CardTitle>
            <CardDescription className="text-text-muted text-xs">
              Manage payroll personnel records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-muted mb-4 text-xs">
              View, filter, edit records, manager assignments, and audit active
              statuses.
            </p>
            <Link href="/app/employees">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Go to Directory
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Compensation Bands
            </CardTitle>
            <CardDescription className="text-text-muted text-xs">
              Review role and level bands by country
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-muted mb-4 text-xs">
              Audit pay bands, compa-ratios, and check for employees falling
              outside midpoints.
            </p>
            <Link href="/app/compensation-bands">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Review Bands
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Market Benchmarking
            </CardTitle>
            <CardDescription className="text-text-muted text-xs">
              Compare pay against industry rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-muted mb-4 text-xs">
              Evaluate payroll rate competitiveness using seeded market datasets
              by department, country, and level.
            </p>
            <Link href="/app/benchmarking">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Compare Benchmarks
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <footer className="border-border/50 text-text-muted mt-16 border-t pt-8 text-center text-xs">
        © 2026 CompensaIQ Corp. All rights reserved.
      </footer>
    </div>
  );
}
