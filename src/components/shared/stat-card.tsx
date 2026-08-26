import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    label: string;
    positive?: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "purple" | "cyan";
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: "bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]",
    border: "border-[var(--border)]",
    valueColor: "text-[var(--foreground)]",
  },
  primary: {
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    border: "border-blue-500/20",
    valueColor: "text-blue-600 dark:text-blue-400",
  },
  success: {
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    border: "border-emerald-500/20",
    valueColor: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    border: "border-amber-500/20",
    valueColor: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    border: "border-rose-500/20",
    valueColor: "text-rose-600 dark:text-rose-400",
  },
  purple: {
    iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    border: "border-purple-500/20",
    valueColor: "text-purple-600 dark:text-purple-400",
  },
  cyan: {
    iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
    border: "border-cyan-500/20",
    valueColor: "text-cyan-600 dark:text-cyan-400",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "rounded-2xl border bg-[var(--card)] p-5 shadow-lg shadow-black/5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-blue-500/5",
        styles.border,
        className,
      )}
    >
      <CardContent className="p-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {title}
          </span>
          {Icon && (
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-transform hover:scale-105",
                styles.iconBg,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <p className={cn("text-3xl font-extrabold tracking-tight", styles.valueColor)}>
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border",
                trend.positive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-[var(--surface-hover)] text-[var(--muted-foreground)] border-[var(--border)]",
              )}
            >
              {trend.label}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
