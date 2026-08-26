import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  className?: string;
  iconColor?: "blue" | "emerald" | "amber" | "purple" | "cyan";
}

const iconColorMap = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-600 group-hover:text-white",
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  className,
  iconColor = "blue",
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-blue-500/5",
        className,
      )}
    >
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 shadow-xs", iconColorMap[iconColor])}>
            <Icon className="h-5 w-5" />
          </div>
          {badge && (
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              {badge}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
            {title}
          </h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
