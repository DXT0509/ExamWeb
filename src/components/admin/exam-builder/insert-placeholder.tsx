"use client";

import { Plus } from "lucide-react";

interface InsertPlaceholderProps {
  label: string;
  onClick?: () => void;
  onInsert?: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function InsertPlaceholder({
  label,
  onClick,
  onInsert,
  disabled = false,
  size = "md",
}: InsertPlaceholderProps) {
  const handleClick = onClick || onInsert || (() => {});

  if (size === "sm") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="group flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-2.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-40 cursor-pointer"
      >
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--surface-hover)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
          <Plus className="h-3 w-3" />
        </div>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="group relative flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-40 cursor-pointer"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] shadow-xs border border-[var(--border)] group-hover:border-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
          <Plus className="h-4 w-4" />
        </div>
        <span>{label}</span>
      </div>
    </button>
  );
}
