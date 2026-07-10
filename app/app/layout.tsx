import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="bg-background text-text-primary flex min-h-screen flex-col transition-colors duration-200">
      <header className="border-border bg-surface/30 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-6">
            <Link href="/app">
              <Logo size={24} />
            </Link>
            <nav className="text-text-muted hidden items-center gap-4 text-xs font-semibold md:flex">
              <Link
                href="/app/employees"
                className="hover:text-text-primary transition-colors"
              >
                Directory
              </Link>
              <Link
                href="/app/compensation-bands"
                className="hover:text-text-primary transition-colors"
              >
                Bands
              </Link>
              <Link
                href="/app/benchmarking"
                className="hover:text-text-primary transition-colors"
              >
                Benchmarking
              </Link>
              <Link
                href="/app/org-chart"
                className="hover:text-text-primary transition-colors"
              >
                Org Chart
              </Link>
              <Link
                href="/app/analytics"
                className="hover:text-text-primary transition-colors"
              >
                Analytics
              </Link>
              <Link
                href="/app/reports"
                className="hover:text-text-primary transition-colors"
              >
                Reports
              </Link>
              <Link
                href="/app/audit-log"
                className="hover:text-text-primary transition-colors"
              >
                Audit Logs
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-text-muted hidden text-xs sm:inline">
              {session.user?.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer text-xs"
              >
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
