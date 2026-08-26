import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { ModalShell } from "@/components/admin/action-form";
import { TaxonomyActions, TaxonomyForm } from "@/components/admin/forms";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { listSubjects } from "@/lib/subjects/queries";
import type { SearchParamsRecord } from "@/lib/admin/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const resolved = await searchParams;
  const { items, count, params } = await listSubjects(resolved);
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Quản lý môn học"
        description="Danh mục các môn học được sử dụng để phân loại và biên soạn đề thi."
        breadcrumbs={[
          { label: "Quản trị", href: "/admin" },
          { label: "Môn học" },
        ]}
        actions={
          <ModalShell
            title="Tạo môn học mới"
            trigger={
              <Button className="flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
                <Plus className="h-4 w-4" />
                <span>Tạo môn học</span>
              </Button>
            }
          >
            <TaxonomyForm type="subject" />
          </ModalShell>
        }
      />

      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
        <CardContent className="p-5 sm:p-6">
          <form className="flex flex-wrap items-end gap-3" action="/admin/subjects">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--foreground)] min-w-[220px] flex-1 sm:flex-initial">
              <span>Tìm kiếm môn học</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  name="q"
                  defaultValue={params.q}
                  placeholder="Tìm tên hoặc slug môn học..."
                  className="pl-9 text-sm bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)]"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--foreground)] min-w-[140px]">
              <span>Trạng thái</span>
              <select
                name="status"
                defaultValue={params.status}
                className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ẩn</option>
              </select>
            </label>

            <Button type="submit" variant="outline" className="h-10 px-4 shrink-0 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
              <Filter className="mr-1.5 h-3.5 w-3.5" /> Lọc
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th className="whitespace-nowrap min-w-[200px]">Tên môn học</Th>
                <Th className="whitespace-nowrap min-w-[180px]">Đường dẫn (Slug)</Th>
                <Th className="whitespace-nowrap min-w-[120px]">Trạng thái</Th>
                <Th className="whitespace-nowrap min-w-[130px]">Ngày cập nhật</Th>
                <Th className="whitespace-nowrap text-right min-w-[120px]">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--surface-hover)]">
                  <Td className="font-semibold text-[var(--foreground)]">{item.name}</Td>
                  <Td className="font-mono text-xs text-[var(--muted-foreground)]">{item.slug}</Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge
                      status={item.is_active ? "active" : "draft"}
                      customLabel={item.is_active ? "Đang hoạt động" : "Tạm ẩn"}
                    />
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-[var(--muted-foreground)]">
                    {new Date(item.updated_at).toLocaleDateString("vi-VN")}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <TaxonomyActions item={item} type="subject" />
                  </Td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <Td colSpan={5} className="text-center py-10 text-[var(--muted-foreground)]">
                    Chưa có môn học nào được tạo.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
        <span>
          Trang {params.page} / {totalPages} — Tổng cộng {count} môn học.
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            {params.page > 1 && (
              <Button asChild variant="outline" size="sm" className="h-8 text-xs border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                <Link
                  href={{
                    pathname: "/admin/subjects",
                    query: { ...resolved, page: params.page - 1 },
                  }}
                >
                  Trang trước
                </Link>
              </Button>
            )}
            {params.page < totalPages && (
              <Button asChild variant="outline" size="sm" className="h-8 text-xs border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                <Link
                  href={{
                    pathname: "/admin/subjects",
                    query: { ...resolved, page: params.page + 1 },
                  }}
                >
                  Trang sau
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
