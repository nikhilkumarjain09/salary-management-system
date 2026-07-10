"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Send,
  ArrowRight,
  Table,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export function PayQueryBox() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const sampleQuestions = [
    "Average pay by department",
    "Headcount cost trend last 12 months",
    "Analyze engineering pay gaps",
    "List underpaid compa-ratio outliers",
  ];

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setRawResult(null);
    setShowRaw(false);

    try {
      const res = await fetch("/api/pay-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: queryText }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.error) {
          setError(data.error);
        } else {
          setAnswer(data.answer);
          setRawResult(data.queryResult);
        }
      } else {
        setError(
          data.error || "An error occurred while processing your request.",
        );
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the query server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(question);
  };

  const formatUSD = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <Card className="border-border bg-surface/50 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-accent shrink-0" size={18} />
          <CardTitle className="text-base font-bold">
            Ask about pay (NL Assistant)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Ask a question (e.g. 'average pay by department', 'cost trend'...)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="border-border bg-background text-text-primary focus:ring-accent/50 focus:border-accent flex-1 rounded-lg border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
          />
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isLoading}
          >
            <Send size={14} className="mr-1.5" />
            Ask
          </Button>
        </form>

        {/* Suggestion tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-text-muted text-[10px] font-semibold tracking-wider uppercase">
            Suggestions:
          </span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuestion(q);
                handleQuery(q);
              }}
              className="text-text-muted hover:text-text-primary bg-background/50 hover:bg-surface-hover border-border/40 rounded-full border px-3 py-1 text-[11px] transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Error Block */}
        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive flex items-start gap-2 rounded-lg border p-4 text-xs leading-relaxed">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <pre className="font-sans whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {/* Response block */}
        {answer && (
          <div className="border-border bg-background/30 space-y-4 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <MessageSquare
                className="text-accent mt-0.5 shrink-0"
                size={16}
              />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-text-primary text-sm leading-relaxed font-medium">
                  {answer}
                </p>

                {/* Raw statistics display toggle */}
                {rawResult && rawResult.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowRaw(!showRaw)}
                      className="text-text-muted hover:text-text-primary inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      <Table size={12} />
                      {showRaw
                        ? "Hide underlying figures"
                        : "View underlying figures"}
                    </button>

                    {showRaw && (
                      <div className="border-border/40 bg-surface max-h-[220px] overflow-hidden overflow-y-auto rounded-lg border">
                        <table className="w-full border-collapse text-left text-[11px]">
                          <thead>
                            <tr className="bg-background/80 border-border/40 text-text-muted border-b font-semibold uppercase">
                              {Object.keys(rawResult[0]).map((key, i) => (
                                <th key={i} className="px-3 py-2">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rawResult.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-border/20 hover:bg-background/40 border-b transition-colors"
                              >
                                {Object.values(row).map((val: any, i) => (
                                  <td
                                    key={i}
                                    className="text-text-muted px-3 py-2 font-mono"
                                  >
                                    {typeof val === "number" && val > 1000
                                      ? formatUSD(val)
                                      : typeof val === "boolean"
                                        ? val
                                          ? "Yes"
                                          : "No"
                                        : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
