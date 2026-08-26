import Link from "next/link";
import { Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogFilterOption, ExamCatalogParams } from "@/lib/exams/catalog";

export function ExamFilterBar({
  params,
  subjects,
  categories,
}: {
  params: ExamCatalogParams;
  subjects: CatalogFilterOption[];
  categories: CatalogFilterOption[];
  isLocked?: boolean;
}) {
  const hasActiveFilter = Boolean(params.q || params.subject || params.category);

  return (
    <form
      className="grid gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-lg shadow-black/5 md:grid-cols-[1.5fr_1fr_1fr_auto_auto]"
      aria-label="Bộ lọc đề thi"
    >
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={params.pageSize} />

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--foreground)]">
        <span>Từ khóa tìm kiếm</span>
        <span className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            className="pl-10 text-sm bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            name="q"
            defaultValue={params.q}
            placeholder="Nhập tên đề thi cần tìm..."
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--foreground)]">
        <span>Môn học</span>
        <select
          name="subject"
          defaultValue={params.subject}
          className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        >
          <option value="">Tất cả môn học</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.slug}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--foreground)]">
        <span>Danh mục</span>
        <select
          name="category"
          defaultValue={params.category}
          className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <Button
          type="submit"
          className="w-full md:w-auto bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20"
        >
          <Filter className="mr-1.5 h-4 w-4" /> Lọc đề thi
        </Button>
      </div>

      {hasActiveFilter && (
        <div className="flex items-end">
          <Button
            asChild
            variant="ghost"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
          >
            <Link href="/exams">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Đặt lại
            </Link>
          </Button>
        </div>
      )}
    </form>
  );
}
