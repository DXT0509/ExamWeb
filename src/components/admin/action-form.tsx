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
  onSuccess,
  disabled = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
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
      {state.message && <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>}
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
          {Object.entries(state.fieldErrors).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      )}
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

export function ModalShell({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setOpen(true);
        }}
        className="contents"
      >
        {trigger}
      </span>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label={title}>
          <div className="w-full max-w-xl rounded-md bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{title}</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Đóng hộp thoại">
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
