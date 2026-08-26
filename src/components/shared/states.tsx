import * as React from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 px-6 py-12 text-center backdrop-blur-xs",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--muted-foreground)]">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Button asChild size="sm" variant="outline">
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Không thể tải dữ liệu",
  description = "Đã xảy ra lỗi trong quá trình tải. Vui lòng thử lại sau.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-8 text-center",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-rose-700 dark:text-rose-200">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-rose-600 dark:text-rose-300/80">{description}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-4 border-rose-500/40 bg-[var(--surface)] text-rose-600 dark:text-rose-300 hover:bg-rose-500/10"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Thử lại
        </Button>
      )}
    </div>
  );
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-label="Đang tải dữ liệu">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-14 items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-label="Đang tải đề thi">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4 shadow-md"
        >
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
