"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Save,
  Trash2,
  Play,
  Sparkles,
  AlertTriangle,
  FolderOpen,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface SavedReport {
  id: string;
  name: string;
  definition: string; // JSON string
  createdAt: string;
}

interface ReportDefinition {
  dimensions: string[];
  metrics: string[];
}

export default function ReportsPage() {
  // Builder configuration state
  const [selectedDims, setSelectedDims] = useState<string[]>(["department"]);
  const [selectedMets, setSelectedMets] = useState<string[]>([
    "avgPay",
    "headcount",
  ]);

  // Saved reports list state
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [newReportName, setNewReportName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Execution state
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch saved reports on mount
  useEffect(() => {
    fetchSavedReports();
  }, []);

  const fetchSavedReports = async () => {
    try {
      const res = await fetch("/api/reports/saved");
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data);
      }
    } catch (err) {
      console.error("Failed to load saved reports:", err);
    }
  };

  const handleDimensionToggle = (dim: string) => {
    if (selectedDims.includes(dim)) {
      if (selectedDims.length > 1) {
        setSelectedDims(selectedDims.filter((d) => d !== dim));
      }
    } else {
      setSelectedDims([...selectedDims, dim]);
    }
  };

  const handleMetricToggle = (met: string) => {
    if (selectedMets.includes(met)) {
      if (selectedMets.length > 1) {
        setSelectedMets(selectedMets.filter((m) => m !== met));
      }
    } else {
      setSelectedMets([...selectedMets, met]);
    }
  };

  const handleRunReport = async () => {
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      const res = await fetch("/api/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dimensions: selectedDims,
          metrics: selectedMets,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        setError(data.error || "Failed to execute report.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the report server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportName.trim()) return;

    setIsSaving(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const res = await fetch("/api/reports/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newReportName,
          definition: {
            dimensions: selectedDims,
            metrics: selectedMets,
          },
        }),
      });

      if (res.ok) {
        setNewReportName("");
        setSuccessMsg("Report configuration saved successfully!");
        fetchSavedReports();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save report definition.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to submit request to server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure you want to delete this saved report configuration?",
      )
    )
      return;

    try {
      const res = await fetch(`/api/reports/saved/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchSavedReports();
      }
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  const handleLoadSavedReport = (report: SavedReport) => {
    try {
      const def: ReportDefinition = JSON.parse(report.definition);
      if (def.dimensions && def.metrics) {
        setSelectedDims(def.dimensions);
        setSelectedMets(def.metrics);
        // Automatically run report
        setTimeout(() => {
          setIsLoading(true);
          fetch("/api/reports/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(def),
          })
            .then((res) => res.json())
            .then((data) => {
              setReportData(data);
              setIsLoading(false);
            });
        }, 100);
      }
    } catch (err) {
      console.error("Failed to parse report definition:", err);
    }
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    // Build headers
    const headers = [...selectedDims];
    if (selectedMets.includes("avgPay")) headers.push("Average Salary (USD)");
    if (selectedMets.includes("medianPay")) headers.push("Median Salary (USD)");
    if (selectedMets.includes("headcount")) headers.push("Headcount");
    if (selectedMets.includes("compaRatio")) headers.push("Compa-Ratio (%)");

    const csvRows = [headers.join(",")];

    for (const row of reportData) {
      const values = [];
      // Dimensions
      for (const dim of selectedDims) {
        values.push(`"${row[dim] || ""}"`);
      }
      // Metrics
      if (selectedMets.includes("avgPay")) values.push(row.avgPayUSD || 0);
      if (selectedMets.includes("medianPay"))
        values.push(row.medianPayUSD || 0);
      if (selectedMets.includes("headcount")) values.push(row.headcount || 0);
      if (selectedMets.includes("compaRatio"))
        values.push(`${row.avgCompaRatio || 100.0}%`);

      csvRows.push(values.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `custom_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMetricHeaderLabel = (met: string) => {
    switch (met) {
      case "avgPay":
        return "Avg Pay (USD)";
      case "medianPay":
        return "Median Pay (USD)";
      case "headcount":
        return "Headcount";
      case "compaRatio":
        return "Avg Compa-Ratio";
      default:
        return met;
    }
  };

  const formatUSD = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col space-y-6 p-6 md:p-12">
      <PageHeader
        title="Custom Report Builder"
        description="Pick dimensions and metrics, inspect real-time precomputed aggregates, and export to CSV."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Config Panel */}
        <div className="space-y-6 lg:col-span-1">
          {/* Builder Options */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">
                Report Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              {/* Dimensions selection */}
              <div className="space-y-2">
                <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                  Dimensions
                </span>
                <div className="space-y-1.5 pt-1">
                  {["department", "country", "level"].map((dim) => (
                    <label
                      key={dim}
                      className="text-text-primary flex cursor-pointer items-center gap-2 hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDims.includes(dim)}
                        onChange={() => handleDimensionToggle(dim)}
                        className="border-border focus:ring-accent accent-accent text-accent rounded"
                      />
                      <span className="capitalize">{dim}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Metrics selection */}
              <div className="space-y-2">
                <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase">
                  Metrics
                </span>
                <div className="space-y-1.5 pt-1">
                  {[
                    { id: "avgPay", label: "Average Salary" },
                    { id: "medianPay", label: "Median Salary" },
                    { id: "headcount", label: "Headcount" },
                    { id: "compaRatio", label: "Average Compa-Ratio" },
                  ].map((met) => (
                    <label
                      key={met.id}
                      className="text-text-primary flex cursor-pointer items-center gap-2 hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMets.includes(met.id)}
                        onChange={() => handleMetricToggle(met.id)}
                        className="border-border focus:ring-accent accent-accent text-accent rounded"
                      />
                      <span>{met.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex w-full items-center justify-center gap-1.5"
                  onClick={handleRunReport}
                  isLoading={isLoading}
                >
                  <Play size={12} />
                  Run Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Report Option */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">
                Save Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <form onSubmit={handleSaveReport} className="space-y-3">
                {successMsg && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-[11px] font-medium text-emerald-500">
                    <CheckCircle size={12} />
                    {successMsg}
                  </div>
                )}
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Report name (e.g. Dept headcount)"
                    value={newReportName}
                    onChange={(e) => setNewReportName(e.target.value)}
                    className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent w-full rounded-lg border px-2.5 py-1.5 text-xs transition-all focus:ring-2 focus:outline-none"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5"
                  isLoading={isSaving}
                >
                  <Save size={12} />
                  Save Report
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Center / Right Results and Saved Configurations */}
        <div className="space-y-6 lg:col-span-3">
          {/* Saved configurations listing */}
          {savedReports.length > 0 && (
            <Card className="border-border bg-surface">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-text-muted" />
                  <CardTitle className="text-sm font-bold">
                    Saved Configurations
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                <div className="flex flex-wrap gap-2">
                  {savedReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => handleLoadSavedReport(report)}
                      className="bg-background/50 hover:bg-surface-hover border-border/60 hover:border-accent/40 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-all"
                    >
                      <span className="text-text-primary font-semibold">
                        {report.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteReport(report.id, e)}
                        className="text-text-muted transition-colors hover:text-rose-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results table */}
          <Card className="border-border bg-surface overflow-hidden">
            <CardHeader className="border-border/40 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    Preview Result
                  </CardTitle>
                  <CardDescription className="text-text-muted text-xs">
                    {reportData
                      ? `${reportData.length} records generated`
                      : "No report executed yet"}
                  </CardDescription>
                </div>
                {reportData && reportData.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={handleExportCSV}
                  >
                    <Download size={12} />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <AlertTriangle className="mb-2 h-10 w-10 text-rose-500" />
                  <p className="text-text-muted text-xs">{error}</p>
                </div>
              ) : !reportData ? (
                <div className="text-text-muted p-12 text-center text-xs italic">
                  Select your dimensions and metrics, then click &quot;Run
                  Report&quot; to inspect aggregate payroll data.
                </div>
              ) : reportData.length === 0 ? (
                <div className="text-text-muted p-12 text-center text-xs italic">
                  No records match selected parameters.
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-background/60 border-border/40 text-text-muted border-b font-semibold tracking-wider uppercase">
                        {selectedDims.map((dim, i) => (
                          <th key={i} className="px-5 py-3.5 capitalize">
                            {dim}
                          </th>
                        ))}
                        {selectedMets.map((met, i) => (
                          <th key={i} className="px-5 py-3.5">
                            {getMetricHeaderLabel(met)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-border/20 hover:bg-background/25 border-b transition-colors"
                        >
                          {selectedDims.map((dim, i) => (
                            <td
                              key={i}
                              className="text-text-primary px-5 py-3 font-medium"
                            >
                              {row[dim]}
                            </td>
                          ))}
                          {selectedMets.map((met, i) => {
                            let cellVal = "";
                            if (met === "avgPay")
                              cellVal = formatUSD(row.avgPayUSD || 0);
                            else if (met === "medianPay")
                              cellVal = formatUSD(row.medianPayUSD || 0);
                            else if (met === "headcount")
                              cellVal = row.headcount || 0;
                            else if (met === "compaRatio")
                              cellVal = `${row.avgCompaRatio || 100}%`;

                            return (
                              <td
                                key={i}
                                className="text-text-muted px-5 py-3 font-mono"
                              >
                                {cellVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
