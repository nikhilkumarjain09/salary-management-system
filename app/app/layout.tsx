import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppLayoutWrapper } from "@/components/ui/AppLayoutWrapper";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <AppLayoutWrapper session={session}>{children}</AppLayoutWrapper>;
}
