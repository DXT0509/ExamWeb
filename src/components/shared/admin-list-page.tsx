import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th } from "@/components/ui/table";

export function AdminListPage({ title }: { title: string }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="grid gap-1 text-sm md:w-80">Tìm kiếm<Input placeholder={`Tìm ${title.toLowerCase()}`} /></label>
        <Button disabled>Hành động placeholder</Button>
      </div>
      <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-4 overflow-x-auto"><Table><thead><tr><Th>Tên</Th><Th>Trạng thái</Th><Th>Cập nhật</Th></tr></thead><tbody><tr><Td>Mẫu hiển thị</Td><Td>Đang hoạt động</Td><Td>Phase 1</Td></tr></tbody></Table><Pagination /></CardContent></Card>
      <div className="grid gap-3 md:grid-cols-3"><EmptyState title={`Chưa có ${title.toLowerCase()}`} /><LoadingRows /><ErrorState /></div>
    </div>
  );
}
