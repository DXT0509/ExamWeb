import { Plus, Search, Filter } from "lucide-react";
import { ModalShell } from "@/components/admin/action-form";
import { DocumentActions, DocumentForm } from "@/components/admin/document-forms";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { listAdminDocuments } from "@/lib/documents/queries";
import type { SearchParamsRecord } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const { items, count, params } = await listAdminDocuments(resolvedParams);
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Quản lý tài liệu"
        description="Quản lý danh sách tài liệu ôn tập, đề cương và cẩm nang học tập dành cho học sinh."
        breadcrumbs={[
          { label: "Quản trị", href: "/admin" },
          { label: "Tài liệu" },
        ]}
        actions={
          <ModalShell
            title="Thêm tài liệu mới"
            trigger={
              <Button className="flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
                <Plus className="h-4 w-4" />
                <span>Thêm tài liệu</span>
              </Button>
            }
          >
            <DocumentForm />
          </ModalShell>
        }
      />

      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
        <CardContent className="p-5 sm:p-6">
          <form
            className="flex flex-wrap items-end gap-3"
            action="/admin/documents"
          >
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--foreground)] min-w-[220px] flex-1 sm:flex-initial">
              <span>Tìm kiếm tài liệu</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  name="q"
                  defaultValue={params.q}
                  placeholder="Tìm tiêu đề hoặc slug..."
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
                <option value="draft">Bản nháp</option>
                <option value="published">Đã xuất bản</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--foreground)] min-w-[130px]">
              <span>Hiển thị</span>
              <select
                name="isPublic"
                defaultValue={params.isPublic}
                className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
              >
                <option value="all">Tất cả</option>
                <option value="true">Công khai</option>
                <option value="false">Riêng tư</option>
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
                <Th className="whitespace-nowrap min-w-[200px]">Tiêu đề</Th>
                <Th className="whitespace-nowrap min-w-[160px]">Đường dẫn (Slug)</Th>
                <Th className="whitespace-nowrap min-w-[120px]">Trạng thái</Th>
                <Th className="whitespace-nowrap min-w-[110px]">Hiển thị</Th>
                <Th className="whitespace-nowrap min-w-[120px]">Loại nguồn</Th>
                <Th className="whitespace-nowrap min-w-[120px]">Ngày cập nhật</Th>
                <Th className="whitespace-nowrap text-right min-w-[110px]">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--surface-hover)]">
                  <Td className="max-w-xs truncate font-semibold text-[var(--foreground)]" title={item.title}>
                    {item.title}
                  </Td>
                  <Td className="text-xs font-mono text-[var(--muted-foreground)]">
                    {item.slug}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </Td>
                  <Td className="whitespace-nowrap">
                    {item.is_public ? (
                      <Badge className="whitespace-nowrap border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 border">
                        Công khai
                      </Badge>
                    ) : (
                      <Badge className="whitespace-nowrap border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted-foreground)] border">
                        Riêng tư
                      </Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {item.external_url ? (
                      <Badge className="whitespace-nowrap border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border">
                        Liên kết ngoài
                      </Badge>
                    ) : (
                      <Badge className="whitespace-nowrap border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 border">
                        Tệp tin
                      </Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-[var(--muted-foreground)]">
                    {new Date(item.updated_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <DocumentActions item={item} />
                  </Td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <Td colSpan={7} className="text-center py-10 text-[var(--muted-foreground)]">
                    Chưa có tài liệu nào phù hợp với điều kiện tìm kiếm.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--muted-foreground)]">
        Trang {params.page} / {totalPages} - Tổng cộng {count} tài liệu.
      </p>
    </div>
  );
}
