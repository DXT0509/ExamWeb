import { LoadingCards, LoadingRows } from "@/components/shared/states";

export default function Loading() {
  return (
    <main className="container-page py-8 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-[var(--surface-hover)] animate-pulse rounded-xl" />
        <div className="h-4 w-72 bg-[var(--surface-hover)]/70 animate-pulse rounded-lg" />
      </div>
      <LoadingCards count={4} />
      <LoadingRows count={3} />
    </main>
  );
}
