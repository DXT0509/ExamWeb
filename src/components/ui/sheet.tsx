"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sheet({ children }: { children: React.ReactNode }) {
  return <Dialog.Root>{children}</Dialog.Root>;
}

export const SheetTrigger = Dialog.Trigger;

export function SheetContent({ children }: { children: React.ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
      <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-72 border-l bg-white p-5 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <Dialog.Title className="font-semibold">Menu</Dialog.Title>
          <Dialog.Close asChild>
            <Button aria-label="Dong menu" size="icon" variant="ghost">
              <X className="h-5 w-5" />
            </Button>
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
