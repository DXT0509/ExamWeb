"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Menu, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardSidebar } from "@/components/navigation/dashboard-sidebar";
import { useTheme } from "@/components/theme/theme-provider";
import type { UserProfile } from "@/lib/auth/session";

export function PublicHeader({ user }: { user?: UserProfile | null }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[var(--foreground)]">
              ExamPrep
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-[var(--muted-foreground)]">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Trang chủ
            </Link>
            <Link
              href="/exams"
              className="px-3 py-1.5 rounded-lg hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Đề thi
            </Link>
            <Link
              href="/documents"
              className="px-3 py-1.5 rounded-lg hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Tài liệu
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={resolvedTheme === "dark" ? "Chuyển sang giao diện Sáng (Light Mode)" : "Chuyển sang giao diện Tối (Dark Mode)"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
            aria-label="Chuyển đổi giao diện Sáng/Tối"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-[var(--warning)] animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--primary)] animate-in spin-in-180 duration-300" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="rounded-xl text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white">
                <Link href={user.role === "admin" ? "/admin" : "/student"}>
                  <User className="mr-1.5 h-3.5 w-3.5" />
                  <span>{user.role === "admin" ? "Quản trị" : "Học sinh"}</span>
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" asChild className="rounded-xl text-xs bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md shadow-blue-600/20">
                <Link href="/login">Đăng nhập</Link>
              </Button>
            </div>
          )}

          {/* Mobile Sheet Trigger */}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-r border-[var(--border)] bg-[var(--surface)]">
                <DashboardSidebar user={user} onItemClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
