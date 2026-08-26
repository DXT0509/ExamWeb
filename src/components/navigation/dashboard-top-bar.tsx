"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardSidebar } from "@/components/navigation/dashboard-sidebar";
import { useTheme } from "@/components/theme/theme-provider";
import { logoutAction } from "@/lib/actions/auth";
import type { UserProfile } from "@/lib/auth/session";

interface DashboardTopBarProps {
  user?: UserProfile | null;
  pageTitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

function getFormattedCurrentDate(): string {
  const now = new Date();
  const days = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const dayName = days[now.getDay()];
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${dayName}, ${day}/${month}/${year}`;
}

export function DashboardTopBar({
  user,
  pageTitle = "Bảng điều khiển",
  breadcrumbs = [],
}: DashboardTopBarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [currentDateString, setCurrentDateString] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentDateString(getFormattedCurrentDate());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/90 px-4 sm:px-6 backdrop-blur-md transition-colors duration-200">
      {/* Left: Mobile Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Sheet */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                aria-label="Mở menu điều hướng"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r border-[var(--border)] bg-[var(--surface)]">
              <DashboardSidebar user={user} onItemClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Page Title & Breadcrumbs */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hidden sm:inline-flex items-center transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>

          {breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] font-medium">
              <span className="hidden sm:inline-block">/</span>
              {breadcrumbs.map((b, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  {b.href ? (
                    <Link
                      href={b.href}
                      className="hover:text-[var(--foreground)] transition-colors line-clamp-1 max-w-[120px]"
                    >
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-[var(--foreground)] font-semibold line-clamp-1 max-w-[150px]">
                      {b.label}
                    </span>
                  )}
                  {idx < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)]" />
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <h1 className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight">
              {pageTitle}
            </h1>
          )}
        </div>
      </div>

      {/* Right Toolbar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date Badge */}
        {currentDateString && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] text-xs font-medium shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>{currentDateString}</span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={resolvedTheme === "dark" ? "Chuyển sang giao diện Sáng (Light Mode)" : "Chuyển sang giao diện Tối (Dark Mode)"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer shadow-xs"
          aria-label="Chuyển đổi giao diện Sáng/Tối"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 text-[var(--warning)] animate-in spin-in-180 duration-300" />
          ) : (
            <Moon className="h-4 w-4 text-[var(--primary)] animate-in spin-in-180 duration-300" />
          )}
        </button>

        {/* User Profile Avatar Dropdown or Login Button */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl p-0.5 hover:ring-2 hover:ring-[var(--primary)]/40 transition-all focus:outline-none cursor-pointer select-none"
                aria-label="Menu tài khoản"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-md shadow-blue-600/25">
                  {(user.display_name || user.displayName || "U")[0]?.toUpperCase() || "U"}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-[var(--border)] bg-[var(--surface)]">
              <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                <p className="text-xs font-bold text-[var(--foreground)] truncate">
                  {user.display_name || user.displayName || "Người dùng"}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{user.email}</p>
                <div className="mt-1">
                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">
                    {user.role === "admin" ? "Quản trị viên" : "Học sinh"}
                  </span>
                </div>
              </div>

              {/* 1. Hồ sơ cá nhân (Chuyển đến /profile) */}
              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer w-full text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg"
                >
                  <User className="h-4 w-4 text-[var(--primary)]" />
                  <span>Hồ sơ cá nhân</span>
                </Link>
              </DropdownMenuItem>

              {/* 2. Không gian học tập (Chỉ hiển thị cho Học sinh, Admin ẩn) */}
              {user.role !== "admin" && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/student"
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer w-full text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[var(--accent)]" />
                    <span>Không gian học tập</span>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="bg-[var(--border)]" />

              {/* 3. Đăng xuất */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    await logoutAction();
                  });
                }}
                disabled={isPending}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--destructive)] hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-[var(--destructive)] rounded-lg cursor-pointer transition-colors"
              >
                <LogOut className="h-4 w-4 text-[var(--destructive)]" />
                <span>{isPending ? "Đang đăng xuất..." : "Đăng xuất"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            asChild
            size="sm"
            className="rounded-xl h-9 px-4 text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md shadow-blue-600/20"
          >
            <Link href="/login">Đăng nhập</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
