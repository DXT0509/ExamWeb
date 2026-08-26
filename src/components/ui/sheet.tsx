"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sheet({ children, open, onOpenChange }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  );
}

export const SheetTrigger = Dialog.Trigger;

interface SheetContentProps {
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}

export function SheetContent({
  children,
  side = "right",
  className,
}: SheetContentProps) {
  const sideClasses =
    side === "left"
      ? "left-0 top-0 h-full border-r animate-in slide-in-from-left duration-300"
      : "right-0 top-0 h-full border-l animate-in slide-in-from-right duration-300";

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in" />
      <Dialog.Content
        className={cn(
          "fixed z-50 h-full w-72 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] p-5 shadow-2xl overflow-y-auto",
          sideClasses,
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <Dialog.Title className="font-semibold text-[var(--foreground)] text-sm sr-only">Menu</Dialog.Title>
          <Dialog.Close asChild>
            <Button aria-label="Đóng menu" size="icon" variant="ghost" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] ml-auto">
              <X className="h-5 w-5" />
            </Button>
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
