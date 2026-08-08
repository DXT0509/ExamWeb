import { Search } from "lucide-react";
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
}) {
  return (
    <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_180px_180px_auto]" aria-label="Bộ lọc đề thi">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={params.pageSize} />
      <label className="grid gap-1 text-sm">
        Tìm kiếm đề thi
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input className="pl-9" name="q" defaultValue={params.q} placeholder="Nhập tên đề thi" />
        </span>
      </label>
      <label className="grid gap-1 text-sm">
        Môn học
        <select name="subject" defaultValue={params.subject} className="h-10 rounded-md border bg-white px-3 text-sm focus-visible:outline-2">
          <option value="">Tất cả môn học</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.slug}>{subject.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Danh mục
        <select name="category" defaultValue={params.category} className="h-10 rounded-md border bg-white px-3 text-sm focus-visible:outline-2">
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>{category.name}</option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <Button type="submit">Lọc đề thi</Button>
      </div>
    </form>
  );
}
