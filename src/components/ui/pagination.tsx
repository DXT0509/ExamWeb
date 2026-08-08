import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({
  page = 1,
  totalPages = 1,
  searchParams = {},
}: {
  page?: number;
  totalPages?: number;
  searchParams?: Record<string, string>;
}) {
  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  };
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-end gap-2">
      <Button asChild={hasPrevious} variant="outline" size="sm" disabled={!hasPrevious}>
        {hasPrevious ? <Link href={hrefFor(page - 1)}>Trước</Link> : <span>Trước</span>}
      </Button>
      <span className="text-sm text-[var(--muted-foreground)]">Trang {page} / {totalPages}</span>
      <Button asChild={hasNext} variant="outline" size="sm" disabled={!hasNext}>
        {hasNext ? <Link href={hrefFor(page + 1)}>Sau</Link> : <span>Sau</span>}
      </Button>
    </nav>
  );
}
