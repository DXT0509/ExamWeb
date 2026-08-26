"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Clock,
  Compass,
  FileSpreadsheet,
  FileText,
  FolderTree,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/navigation/sidebar-provider";
import { logoutAction } from "@/lib/actions/auth";
import type { UserProfile } from "@/lib/auth/session";

interface DashboardSidebarProps {
  user?: UserProfile | null;
  onItemClick?: () => void;
}

export function DashboardSidebar({ user, onItemClick }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const linkClass = (href: string) => {
    const active = isActive(href);
    return `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
      isCollapsed ? "justify-center px-2 py-2.5" : ""
    } ${
      active
        ? "bg-[var(--primary)] text-white shadow-md shadow-blue-600/25"
        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
    }`;
  };

  const isStudent = user && user.role !== "admin";
  const isAdmin = user?.role === "admin";

  return (
    <aside
      className={`relative flex h-full w-full flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] select-none transition-all duration-300 ${
        isCollapsed ? "p-2.5" : "p-4"
      }`}
    >
      {/* Center Edge Collapse/Expand Handle (Thanh dài ở chính giữa cạnh phải, nằm gọn bên trong menu) */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={isCollapsed ? "Mở rộng menu (Ctrl+B)" : "Thu hẹp menu (Ctrl+B)"}
        aria-label={isCollapsed ? "Mở rộng menu" : "Thu hẹp menu"}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 z-30 h-14 w-3.5 items-center justify-center rounded-l-md border border-r-0 border-[var(--border)] bg-[var(--card)] hover:bg-[var(--surface-hover)] shadow-xs transition-all duration-200 cursor-pointer group active:scale-95"
      >
        {/* Center Triangle Indicator */}
        <svg
          viewBox="0 0 6 10"
          fill="currentColor"
          className={`h-2.5 w-2 transition-transform duration-300 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] ${
            isCollapsed ? "rotate-0" : "rotate-180"
          }`}
        >
          <polygon points="1 1, 5 5, 1 9" />
        </svg>
      </button>

      {/* Top Header & Navigation */}
      <div className="space-y-4 overflow-y-auto overflow-x-hidden pr-0.5">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] min-h-[46px]">
          {!isCollapsed ? (
            <Link
              href="/"
              onClick={onItemClick}
              className="flex items-center gap-2.5 group overflow-hidden"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-[var(--foreground)]">
                    ExamPrep
                  </span>
                  <span className="rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 px-1.5 py-0.2 text-[10px] font-bold text-[var(--primary)]">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] font-mono">DEV PLATFORM</p>
              </div>
            </Link>
          ) : (
            <div className="w-full flex justify-center">
              <Link
                href="/"
                onClick={onItemClick}
                title="ExamPrep - Trang chủ"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-blue-600/30 hover:scale-105 transition-transform"
              >
                <GraduationCap className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4">
          {/* Section 1: HỆ THỐNG */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Hệ thống
              </p>
            ) : (
              <div className="h-px bg-[var(--border)] my-1.5" />
            )}
            <Link
              href="/"
              onClick={onItemClick}
              title="Trang chủ"
              className={linkClass("/")}
            >
              <Home className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Trang chủ</span>}
            </Link>
            <Link
              href="/exams"
              onClick={onItemClick}
              title="Thư viện đề thi"
              className={linkClass("/exams")}
            >
              <Compass className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Thư viện đề thi</span>}
            </Link>
            {isStudent && (
              <Link
                href="/student/history"
                onClick={onItemClick}
                title="Lịch sử làm bài"
                className={linkClass("/student/history")}
              >
                <Clock className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Lịch sử làm bài</span>}
              </Link>
            )}
          </div>

          {/* Section 2: TÀI LIỆU & HỌC TẬP */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                Tài liệu & Học tập
              </p>
            ) : (
              <div className="h-px bg-[var(--border)] my-1.5" />
            )}
            <Link
              href="/documents"
              onClick={onItemClick}
              title="Tài liệu ôn tập"
              className={linkClass("/documents")}
            >
              <FileText className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Tài liệu ôn tập</span>}
            </Link>
            {isStudent && (
              <Link
                href="/student"
                onClick={onItemClick}
                title="Không gian học tập"
                className={linkClass("/student")}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Không gian học tập</span>}
              </Link>
            )}
          </div>

          {/* Section 3: QUẢN TRỊ VIÊN (NẾU ROLE = ADMIN) */}
          {isAdmin && (
            <div className={`space-y-1 ${!isCollapsed ? "border-t border-[var(--border)] pt-3" : ""}`}>
              {!isCollapsed ? (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--purple)] flex items-center gap-1">
                  <Shield className="h-3 w-3 text-[var(--purple)] shrink-0" />
                  <span className="truncate">Quản trị hệ thống</span>
                </p>
              ) : (
                <div className="h-px bg-[var(--border)] my-1.5" />
              )}
              <Link
                href="/admin"
                onClick={onItemClick}
                title="Dashboard tổng quan"
                className={linkClass("/admin")}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Dashboard tổng quan</span>}
              </Link>
              <Link
                href="/admin/exams"
                onClick={onItemClick}
                title="Quản lý đề thi"
                className={linkClass("/admin/exams")}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Quản lý đề thi</span>}
              </Link>
              <Link
                href="/admin/attempts"
                onClick={onItemClick}
                title="Lượt thi & Kết quả"
                className={linkClass("/admin/attempts")}
              >
                <Clock className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Lượt thi & Kết quả</span>}
              </Link>
              <Link
                href="/admin/students"
                onClick={onItemClick}
                title="Quản lý học sinh"
                className={linkClass("/admin/students")}
              >
                <Users className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Quản lý học sinh</span>}
              </Link>
              <Link
                href="/admin/subjects"
                onClick={onItemClick}
                title="Môn học & Chuyên đề"
                className={linkClass("/admin/subjects")}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Môn học & Chuyên đề</span>}
              </Link>
              <Link
                href="/admin/categories"
                onClick={onItemClick}
                title="Danh mục đề thi"
                className={linkClass("/admin/categories")}
              >
                <FolderTree className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Danh mục đề thi</span>}
              </Link>
              <Link
                href="/admin/documents"
                onClick={onItemClick}
                title="Quản lý tài liệu"
                className={linkClass("/admin/documents")}
              >
                <FileText className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Quản lý tài liệu</span>}
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Footer Area: User Card or Login */}
      <div className="border-t border-[var(--border)] pt-3 mt-3">
        {user ? (
          !isCollapsed ? (
            <div className="flex items-center justify-between rounded-xl bg-[var(--card-secondary)] border border-[var(--border)] p-2.5">
              <Link
                href="/profile"
                onClick={onItemClick}
                className="flex items-center gap-2 overflow-hidden hover:opacity-80 transition-opacity"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-white text-xs font-bold shadow-xs">
                  {(user.display_name || user.displayName || "U")[0]?.toUpperCase() || "U"}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-[var(--foreground)] truncate">
                    {user.display_name || user.displayName || "Người dùng"}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">{user.email}</p>
                </div>
              </Link>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--surface-hover)]"
                  title="Đăng xuất"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/profile"
                onClick={onItemClick}
                title={`Hồ sơ: ${user.display_name || user.displayName || user.email}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white text-xs font-bold shadow-xs hover:ring-2 hover:ring-[var(--primary)]/40 transition-all"
              >
                {(user.display_name || user.displayName || "U")[0]?.toUpperCase() || "U"}
              </Link>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--surface-hover)]"
                  title="Đăng xuất"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          )
        ) : (
          !isCollapsed ? (
            <div className="space-y-2">
              <Button
                asChild
                className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-xl text-xs h-9 shadow-md shadow-blue-600/20"
              >
                <Link href="/login" onClick={onItemClick}>
                  Đăng nhập tài khoản
                </Link>
              </Button>
              <p className="text-center text-[10px] text-[var(--muted-foreground)]">
                Đăng nhập để lưu tiến độ.
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                asChild
                size="icon"
                className="h-8 w-8 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs"
                title="Đăng nhập tài khoản"
              >
                <Link href="/login" onClick={onItemClick}>
                  <Users className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
