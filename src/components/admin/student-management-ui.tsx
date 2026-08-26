"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { ActionForm } from "@/components/admin/action-form";
import { toggleStudentLockAction } from "@/lib/students/actions";
import type { StudentItem, StudentListResult } from "@/lib/students/types";

export function StudentLockDialog({ student }: { student: StudentItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isLocking = student.status === "active";

  const title = isLocking ? "Khóa tài khoản học sinh?" : "Mở khóa tài khoản học sinh?";
  const description = isLocking
    ? "Học sinh này sẽ không thể tiếp tục sử dụng các chức năng yêu cầu tài khoản. Các bài thi đang thực hiện sẽ được tự động nộp."
    : "Học sinh sẽ có thể tiếp tục truy cập và sử dụng các chức năng của hệ thống.";

  const submitLabel = isLocking ? "Khóa tài khoản" : "Mở khóa tài khoản";
  const pendingLabel = isLocking ? "Đang khóa..." : "Đang mở khóa...";

  return (
    <>
      {isLocking ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
          className="rounded-xl text-xs"
        >
          Khóa tài khoản
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="rounded-xl text-xs border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
        >
          Mở khóa tài khoản
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
            <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
              {description}
            </p>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-3.5 text-sm text-[var(--foreground)] space-y-1">
              <p>
                <span className="font-semibold text-[var(--muted-foreground)]">Họ tên:</span>{" "}
                <span className="font-medium text-[var(--foreground)]">{student.display_name || "Chưa đặt tên"}</span>
              </p>
              <p>
                <span className="font-semibold text-[var(--muted-foreground)]">Email:</span>{" "}
                <span className="text-[var(--primary)] font-mono text-xs">{student.email}</span>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
              >
                Hủy
              </Button>
              <ActionForm
                action={toggleStudentLockAction}
                submitLabel={submitLabel}
                pendingLabel={pendingLabel}
                onSuccess={() => {
                  setOpen(false);
                  router.refresh();
                }}
                className="inline-block"
              >
                <input type="hidden" name="studentId" value={student.id} />
                <input
                  type="hidden"
                  name="targetStatus"
                  value={isLocking ? "locked" : "active"}
                />
              </ActionForm>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function StudentManagementUI({
  data,
  params,
}: {
  data: StudentListResult;
  params: { q: string; status: string; page: number; pageSize: number };
}) {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-end w-full"
          action="/admin/students"
          method="get"
        >
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)] flex-1 sm:max-w-xs">
            <span>Tìm kiếm học sinh</span>
            <Input
              name="q"
              defaultValue={params.q}
              placeholder="Tìm theo tên hoặc email..."
              className="bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)]"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)] w-full sm:w-44">
            <span>Trạng thái</span>
            <select
              name="status"
              defaultValue={params.status}
              className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </label>
          <Button type="submit" variant="default" className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
            Lọc học sinh
          </Button>
        </form>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-[var(--divider)]">
          <CardTitle className="text-base font-bold text-[var(--foreground)]">
            Danh sách học sinh ({data.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Họ tên</Th>
                <Th>Email</Th>
                <Th>Trạng thái</Th>
                <Th>Ngày tạo</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((student) => (
                <tr key={student.id} className="hover:bg-[var(--surface-hover)] group">
                  <Td className="font-semibold text-[var(--foreground)]">
                    {student.display_name || "Chưa đặt tên"}
                  </Td>
                  <Td className="text-[var(--muted-foreground)] font-mono text-xs">{student.email}</Td>
                  <Td>
                    {student.status === "active" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        Đang hoạt động
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        Đã khóa
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-xs text-[var(--muted-foreground)]">
                    {new Date(student.created_at).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </Td>
                  <Td className="text-right">
                    <StudentLockDialog student={student} />
                  </Td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                    Không tìm thấy học sinh phù hợp.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--divider)] p-4 text-xs text-[var(--muted-foreground)]">
              <p>
                Trang {data.page} / {data.totalPages} - Tổng cộng {data.total}{" "}
                học sinh.
              </p>
              <div className="flex gap-2">
                {data.page > 1 && (
                  <Button variant="outline" size="sm" asChild className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                    <a
                      href={`/admin/students?q=${encodeURIComponent(params.q)}&status=${params.status}&page=${data.page - 1}`}
                    >
                      Trang trước
                    </a>
                  </Button>
                )}
                {data.page < data.totalPages && (
                  <Button variant="outline" size="sm" asChild className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                    <a
                      href={`/admin/students?q=${encodeURIComponent(params.q)}&status=${params.status}&page=${data.page + 1}`}
                    >
                      Trang sau
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
