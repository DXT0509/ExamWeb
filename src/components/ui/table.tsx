import * as React from "react";
import { cn } from "@/lib/utils";

function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn("w-full text-sm text-left text-[var(--foreground)]", className)}
        {...props}
      />
    </div>
  );
}

function Th({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] backdrop-blur-xs",
        className
      )}
      {...props}
    />
  );
}

function Td({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-[var(--border)]/60 px-4 py-3.5 align-middle text-[var(--foreground)] transition-colors group-hover:bg-[var(--surface-hover)]",
        className
      )}
      {...props}
    />
  );
}

export { Table, Th, Td };
