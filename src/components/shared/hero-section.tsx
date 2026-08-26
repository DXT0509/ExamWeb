import * as React from "react";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  badge?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
  sideContent?: React.ReactNode;
  className?: string;
}

export function HeroSection({
  badge,
  title,
  description,
  actions,
  sideContent,
  className,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/30 py-12 md:py-16",
        className,
      )}
    >
      <div className="container-page grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-center">
        <div className="space-y-4">
          {badge && <div className="inline-block">{badge}</div>}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base text-slate-600 sm:text-lg leading-relaxed">
              {description}
            </p>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {actions}
            </div>
          )}
        </div>

        {sideContent && (
          <div className="flex justify-center md:justify-end">
            {sideContent}
          </div>
        )}
      </div>
    </section>
  );
}
