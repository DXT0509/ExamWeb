import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
