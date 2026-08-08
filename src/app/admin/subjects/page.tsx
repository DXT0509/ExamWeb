import { ModalShell } from "@/components/admin/action-form";
import { TaxonomyActions, TaxonomyForm } from "@/components/admin/forms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { listSubjects } from "@/lib/subjects/queries";
import type { SearchParamsRecord } from "@/lib/admin/types";

export default async function Page({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const { items, count, params } = await listSubjects(await searchParams);
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <form className="flex flex-col gap-2 md:flex-row md:items-end" action="/admin/subjects">
          <label className="grid gap-1 text-sm">Tìm kiếm<Input name="q" defaultValue={params.q} placeholder="Tìm tên hoặc slug" /></label>
          <label className="grid gap-1 text-sm">Trạng thái<select name="status" defaultValue={params.status} className="h-10 rounded-md border px-3 text-sm"><option value="all">Tất cả</option><option value="active">Đang hoạt động</option><option value="inactive">Tạm ẩn</option></select></label>
          <Button type="submit" variant="outline">Lọc</Button>
        </form>
        <ModalShell title="Tạo môn học" trigger={<Button>Tạo môn học</Button>}><TaxonomyForm type="subject" /></ModalShell>
      </div>
      <Card>
        <CardHeader><CardTitle>Môn học</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead><tr><Th>Tên môn học</Th><Th>Slug</Th><Th>Trạng thái</Th><Th>Ngày cập nhật</Th><Th>Hành động</Th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td>{item.name}</Td><Td>{item.slug}</Td>
                  <Td><Badge>{item.is_active ? "Đang hoạt động" : "Tạm ẩn"}</Badge></Td>
                  <Td>{new Date(item.updated_at).toLocaleDateString("vi-VN")}</Td>
                  <Td><TaxonomyActions item={item} type="subject" /></Td>
                </tr>
              ))}
              {items.length === 0 && <tr><Td colSpan={5}>Chưa có dữ liệu.</Td></tr>}
            </tbody>
          </Table>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Trang {params.page} / {totalPages} - Tổng cộng {count} môn học.</p>
        </CardContent>
      </Card>
    </div>
  );
}
