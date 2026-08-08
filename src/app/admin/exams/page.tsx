import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import type { SearchParamsRecord } from "@/lib/admin/types";
import { listActiveCategories } from "@/lib/categories/queries";
import { accessTypeLabels, examStatusLabels, listExams } from "@/lib/exams/queries";
import { listActiveSubjects } from "@/lib/subjects/queries";

export default async function Page({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const resolved = await searchParams;
  const [{ items, count, params }, subjects, categories] = await Promise.all([listExams(resolved), listActiveSubjects(), listActiveCategories()]);
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <form className="grid gap-2 md:grid-cols-6 md:items-end" action="/admin/exams">
          <label className="grid gap-1 text-sm md:col-span-2">Từ khóa<Input name="q" defaultValue={params.q} placeholder="Tìm tiêu đề hoặc slug" /></label>
          <label className="grid gap-1 text-sm">Trạng thái<select name="status" defaultValue={params.status} className="h-10 rounded-md border px-3 text-sm"><option value="all">Tất cả</option>{Object.entries(examStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Môn học<select name="subjectId" defaultValue={params.subjectId} className="h-10 rounded-md border px-3 text-sm"><option value="all">Tất cả</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Danh mục<select name="categoryId" defaultValue={params.categoryId} className="h-10 rounded-md border px-3 text-sm"><option value="all">Tất cả</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <Button type="submit" variant="outline">Lọc</Button>
        </form>
        <Button asChild><Link href="/admin/exams/new">Tạo đề mới</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Đề thi</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead><tr><Th>Tiêu đề</Th><Th>Môn học</Th><Th>Danh mục</Th><Th>Trạng thái</Th><Th>Quyền truy cập</Th><Th>Thời gian</Th><Th>Tổng điểm</Th><Th>Cập nhật</Th><Th>Hành động</Th></tr></thead>
            <tbody>
              {items.map((exam) => (
                <tr key={exam.id}>
                  <Td>{exam.title}</Td>
                  <Td>{exam.subjects?.name ?? "Chưa có"}</Td>
                  <Td>{exam.exam_categories?.name ?? "Không chọn"}</Td>
                  <Td><Badge>{examStatusLabels[exam.status]}</Badge></Td>
                  <Td>{accessTypeLabels[exam.access_type]}</Td>
                  <Td>{exam.duration_minutes} phút</Td>
                  <Td>{exam.total_score}</Td>
                  <Td>{new Date(exam.updated_at).toLocaleDateString("vi-VN")}</Td>
                  <Td><Button asChild size="sm" variant="outline"><Link href={`/admin/exams/${exam.id}`}>Mở</Link></Button></Td>
                </tr>
              ))}
              {items.length === 0 && <tr><Td colSpan={9}>Chưa có đề thi.</Td></tr>}
            </tbody>
          </Table>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Trang {params.page} / {totalPages} - Tổng cộng {count} đề thi.</p>
        </CardContent>
      </Card>
    </div>
  );
}
