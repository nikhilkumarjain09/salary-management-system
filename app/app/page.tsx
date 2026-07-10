import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AppPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="bg-background text-text-primary mx-auto flex min-h-screen w-full max-w-7xl flex-col p-6 md:p-12">
      <header className="border-border mb-8 flex items-center justify-between border-b pb-8">
        <Logo size={28} />
        <div className="flex items-center gap-4">
          <span className="text-text-muted text-sm">{session.user?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 space-y-8">
        <PageHeader
          title="HR Management Portal"
          description="Welcome to the PaySight administrative dashboard. Select a section from the navigation or search using keyboard shortcut Ctrl+K."
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>
                Manage ACME&apos;s 10,000 employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted mb-4 text-sm">
                View, filter, edit records, manager assignments, and audit
                active statuses.
              </p>
              <Link href="/app/employees">
                <Button variant="outline" size="sm" className="w-full">
                  Go to Directory
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compensation Bands</CardTitle>
              <CardDescription>
                Review role/level bands by country
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted mb-4 text-sm">
                Audit pay bands, compa-ratios, and check for employees falling
                outside midpoints.
              </p>
              <Link href="/app/compensation-bands">
                <Button variant="outline" size="sm" className="w-full">
                  Review Bands
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pay Analysis & Reports</CardTitle>
              <CardDescription>Analyze pay equity and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted mb-4 text-sm">
                Query precomputed database metrics via the Natural Language
                query interface.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Open Reports (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>Track every system mutation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted mb-4 text-sm">
                Review the immutable record of all creates, updates,
                deactivations, and bulk actions.
              </p>
              <Link href="/app/audit-log">
                <Button variant="outline" size="sm" className="w-full">
                  View Audit Log
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-border/50 text-text-muted mt-16 border-t pt-8 text-center text-xs">
        © 2026 PaySight Corp. All rights reserved.
      </footer>
    </div>
  );
}
