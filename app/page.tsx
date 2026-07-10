import React from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Home() {
  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-12">
      <header className="border-border mb-8 flex items-center justify-between border-b pb-8">
        <Logo size={28} />
        <div className="text-text-muted text-xs">v0.1.0</div>
      </header>

      <main className="flex-1 space-y-12">
        <PageHeader
          title="Design System Playground"
          description="Review the custom PaySight design tokens, Dark Theme palette, and first-pass reusable components."
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                Secondary Action
              </Button>
              <Button variant="primary" size="sm">
                Primary Action
              </Button>
            </div>
          }
        />

        {/* Design Tokens Section */}
        <section className="space-y-4">
          <h2 className="text-text-primary text-xl font-bold tracking-tight">
            Theme Palette & Tokens
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
            <div className="bg-background border-border flex flex-col rounded-lg border p-4">
              <div className="bg-background border-border mb-2 h-10 w-full rounded border"></div>
              <span className="text-xs font-semibold">Background</span>
              <span className="text-text-muted text-[10px]">#08080a</span>
            </div>
            <div className="bg-surface border-border flex flex-col rounded-lg border p-4">
              <div className="bg-surface border-border/20 mb-2 h-10 w-full rounded border"></div>
              <span className="text-xs font-semibold">Surface</span>
              <span className="text-text-muted text-[10px]">#121216</span>
            </div>
            <div className="bg-surface-hover border-border flex flex-col rounded-lg border p-4">
              <div className="bg-surface-hover mb-2 h-10 w-full rounded"></div>
              <span className="text-xs font-semibold">Surface Hover</span>
              <span className="text-text-muted text-[10px]">#1c1c24</span>
            </div>
            <div className="bg-surface border-border flex flex-col rounded-lg border p-4">
              <div className="bg-border mb-2 h-10 w-full rounded"></div>
              <span className="text-xs font-semibold">Border</span>
              <span className="text-text-muted text-[10px]">#222229</span>
            </div>
            <div className="bg-surface border-border flex flex-col rounded-lg border p-4">
              <div className="bg-text-primary mb-2 h-10 w-full rounded"></div>
              <span className="text-xs font-semibold">Text Primary</span>
              <span className="text-text-muted text-[10px]">#f4f4f5</span>
            </div>
            <div className="bg-surface border-border flex flex-col rounded-lg border p-4">
              <div className="bg-text-muted mb-2 h-10 w-full rounded"></div>
              <span className="text-xs font-semibold">Text Muted</span>
              <span className="text-text-muted text-[10px]">#9fa0a6</span>
            </div>
            <div className="bg-surface border-border flex flex-col rounded-lg border p-4">
              <div className="bg-accent mb-2 h-10 w-full rounded"></div>
              <span className="text-xs font-semibold">Accent</span>
              <span className="text-text-muted text-[10px]">#6366f1</span>
            </div>
          </div>
        </section>

        {/* Buttons Grid */}
        <section className="space-y-4">
          <h2 className="text-text-primary text-xl font-bold tracking-tight">
            Button Component
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Button Variants and Sizes</CardTitle>
              <CardDescription>
                Buttons support sizes, loaders, and dark-theme specific hover
                styles.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row flex-wrap items-center gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Cards & Loading Skeletons */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-text-primary text-xl font-bold tracking-tight">
              Card Component
            </h2>
            <Card hoverable>
              <CardHeader>
                <CardTitle>Interactable Card</CardTitle>
                <CardDescription>
                  Hover over this card to see highlight effect.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-text-muted text-sm leading-relaxed">
                  This card uses our shared spacing and border-radius tokens.
                  All cards, buttons, and inputs share a consistent look and
                  feel.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  Action
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-text-primary text-xl font-bold tracking-tight">
              Skeleton Loaders
            </h2>
            <Card>
              <CardHeader>
                <CardTitle>Data Loading State</CardTitle>
                <CardDescription>
                  Skeletons mimic asynchronous data fetch UI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Empty States & Local Spinners */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-text-primary text-xl font-bold tracking-tight">
              Empty State Layout
            </h2>
            <EmptyState
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
              title="No Data Available"
              description="There are currently no salary histories recorded for this selection. Press button below to add one."
              action={
                <Button variant="primary" size="sm">
                  Add Record
                </Button>
              }
            />
          </div>

          <div className="flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-text-primary text-xl font-bold tracking-tight">
                Inline Spinner Loader
              </h2>
              <Card className="flex min-h-[300px] flex-col items-center justify-center">
                <LoadingSpinner size="lg" className="mb-4" />
                <span className="text-text-muted text-sm">
                  Fetching pay statistics...
                </span>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border/50 text-text-muted mt-16 border-t pt-8 text-center text-xs">
        © 2026 PaySight Corp. All rights reserved.
      </footer>
    </div>
  );
}
