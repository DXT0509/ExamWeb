import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th } from "@/components/ui/table";

export function AdminListPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: "Quản trị", href: "/admin" },
          { label: title },
        ]}
        actions={<Button disabled>Hành động mẫu</Button>}
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)] md:w-80">
              <span>Tìm kiếm</span>
              <Input placeholder={`Tìm ${title.toLowerCase()}...`} />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Tên</Th>
                <Th>Trạng thái</Th>
                <Th>Cập nhật</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[var(--surface-hover)] group">
                <Td className="font-semibold text-[var(--foreground)]">Mẫu hiển thị</Td>
                <Td>
                  <StatusBadge status="active" />
                </Td>
                <Td className="text-xs text-[var(--muted-foreground)]">Mới cập nhật</Td>
              </tr>
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Pagination />

      <div className="grid gap-4 md:grid-cols-3 pt-4">
        <EmptyState title={`Chưa có ${title.toLowerCase()}`} />
        <LoadingRows />
        <ErrorState />
      </div>
    </div>
  );
}
