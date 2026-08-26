"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/admin/types";

const initialState: ActionState = { ok: false, message: "" };

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Đang lưu...",
  className,
  buttonVariant = "default",
  buttonClassName,
  onSuccess,
  disabled = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  buttonClassName?: string;
  onSuccess?: () => void;
  disabled?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      onSuccess?.();
    } else {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className={className ?? "space-y-3"}>
      {children}
      {state.message && <p className={state.ok ? "text-sm text-emerald-600 dark:text-emerald-400 font-medium" : "text-sm text-rose-600 dark:text-rose-400 font-medium"}>{state.message}</p>}
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-rose-600 dark:text-rose-400">
          {Object.entries(state.fieldErrors).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      )}
      <Button
        type="submit"
        variant={buttonVariant}
        className={buttonClassName}
        disabled={disabled || isPending}
      >
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

export function ModalShell({
  title,
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  title: string;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  return (
    <>
      {trigger && (
        <span
          onClick={() => setOpen(true)}
          className="contents"
        >
          {trigger}
        </span>
      )}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="relative my-auto w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl text-[var(--foreground)] text-left">
            <div className="mb-4 flex items-center justify-between gap-3 sticky top-0 bg-[var(--surface)] pb-3 z-10 border-b border-[var(--divider)]">
              <h2 className="text-lg font-bold text-[var(--foreground)] text-left">{title}</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Đóng hộp thoại"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl"
              >
                Đóng
              </Button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
