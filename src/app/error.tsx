"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="container-page py-12">
      <h1 className="text-2xl font-semibold">Co loi xay ra</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">Không tải được màn hình hiện tại.</p>
      <Button className="mt-4" onClick={reset}>Thử lại</Button>
    </main>
  );
}
