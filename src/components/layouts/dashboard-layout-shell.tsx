"use client";

import { Suspense } from "react";
import { DashboardSidebar } from "@/components/navigation/dashboard-sidebar";
import { DashboardTopBar } from "@/components/navigation/dashboard-top-bar";
import { FloatingSupport } from "@/components/navigation/floating-support";
import { useSidebar } from "@/components/navigation/sidebar-provider";
import type { UserProfile } from "@/lib/auth/session";

interface DashboardLayoutShellProps {
  user?: UserProfile | null;
  pageTitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  children: React.ReactNode;
}

export function DashboardLayoutShell({
  user,
  pageTitle,
  breadcrumbs,
  children,
}: DashboardLayoutShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen w-full bg-cyber-grid bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      {/* Left Navigation Sidebar for Desktop */}
      <div
        className={`hidden md:flex shrink-0 flex-col fixed inset-y-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:w-[72px]" : "md:w-64 lg:w-72"
        }`}
      >
        <Suspense fallback={<div className="h-full w-full bg-[var(--surface)] border-r border-[var(--border)]" />}>
          <DashboardSidebar user={user} />
        </Suspense>
      </div>

      {/* Main Content Area */}
      <div
        className={`flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:pl-[72px]" : "md:pl-64 lg:pl-72"
        }`}
      >
        {/* Top Header Bar */}
        <DashboardTopBar
          user={user}
          pageTitle={pageTitle}
          breadcrumbs={breadcrumbs}
        />

        {/* Page Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Chat Support Widget */}
      <FloatingSupport />
    </div>
  );
}
