import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  // Exam status
  published: {
    label: "Đã xuất bản",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border",
  },
  draft: {
    label: "Bản nháp",
    className: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] border",
  },
  closed: {
    label: "Đã đóng",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 border",
  },
  archived: {
    label: "Đã lưu trữ",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 border",
  },

  // Attempt status
  in_progress: {
    label: "Đang làm bài",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 border",
  },
  submitted: {
    label: "Đã nộp",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border",
  },
  auto_submitted: {
    label: "Tự động nộp",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 border",
  },
  expired: {
    label: "Đã hết hạn",
    className: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 border",
  },

  // User status
  active: {
    label: "Đang hoạt động",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border",
  },
  locked: {
    label: "Đã bị khóa",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 border",
  },

  // Access type
  public: {
    label: "Công khai",
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border",
  },
  students_only: {
    label: "Yêu cầu đăng nhập",
    className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border",
  },
  private: {
    label: "Riêng tư",
    className: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] border",
  },
};

export function StatusBadge({
  status,
  customLabel,
  className,
}: {
  status: string;
  customLabel?: string;
  className?: string;
}) {
  const config = statusConfig[status];
  const label = customLabel || config?.label || status;
  const styleClass = config?.className || "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] border";

  return (
    <Badge className={cn("font-medium shrink-0 rounded-full px-2.5 py-0.5 text-xs shadow-xs", styleClass, className)}>
      {label}
    </Badge>
  );
}
