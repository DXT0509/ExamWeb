"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import {
  formatAttemptStatus,
  formatDateTime,
  formatSubmitReason,
} from "@/lib/attempts/formatters";
import type { AdminAttemptListResult } from "@/lib/attempts/types";

interface SubjectOption {
  id: string;
  name: string;
}

interface ExamOption {
  id: string;
  title: string;
}

interface AttemptManagementUIProps {
  data: AdminAttemptListResult;
  params: {
    q?: string;
    subjectId?: string;
    examId?: string;
    status?: string;
    submitReason?: string;
    page?: number;
    pageSize?: number;
  };
  subjects: SubjectOption[];
  exams: ExamOption[];
}

export function AttemptManagementUI({
  data,
  params,
  subjects,
  exams,
}: AttemptManagementUIProps) {
  return (
    <div className="space-y-6 pb-12">
      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
        <CardContent className="p-5 sm:p-6">
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
            {/* Search Q */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-[var(--foreground)]">Tìm kiếm</label>
              <Input
                name="q"
                placeholder="Tên học sinh, email, đề thi..."
                defaultValue={params.q || ""}
                className="bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)]"
              />
            </div>

            {/* Subject filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">Môn học</label>
              <select
                name="subjectId"
                className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                defaultValue={params.subjectId || "all"}
              >
                <option value="all">Tất cả môn học</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">Đề thi</label>
              <select
                name="examId"
                className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                defaultValue={params.examId || "all"}
              >
                <option value="all">Tất cả đề thi</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">Trạng thái</label>
              <select
                name="status"
                className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                defaultValue={params.status || "all"}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="in_progress">Đang làm</option>
                <option value="submitted">Đã nộp</option>
                <option value="auto_submitted">Tự động nộp</option>
                <option value="expired">Hết giờ</option>
              </select>
            </div>

            {/* Submit reason filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">Lý do nộp</label>
              <select
                name="submitReason"
                className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                defaultValue={params.submitReason || "all"}
              >
                <option value="all">Tất cả lý do</option>
                <option value="student_submit">Nộp thủ công</option>
                <option value="time_expired">Hết thời gian</option>
                <option value="fullscreen_violation">Vi phạm toàn màn hình</option>
                <option value="account_locked">Tài khoản bị khóa</option>
                <option value="system_recovery">Khôi phục hệ thống</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2 lg:col-span-6 pt-2">
              <Button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
                Lọc lượt thi
              </Button>
              <Button variant="outline" asChild className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                <Link href="/admin/attempts">Xóa bộ lọc</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-[var(--divider)]">
          <CardTitle className="text-base font-bold text-[var(--foreground)]">
            Danh sách lượt thi ({data.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1150px] w-full text-sm">
            <thead>
              <tr>
                <Th className="whitespace-nowrap min-w-[200px]">Người làm bài</Th>
                <Th className="whitespace-nowrap min-w-[220px]">Đề thi</Th>
                <Th className="whitespace-nowrap min-w-[120px]">Môn học</Th>
                <Th className="whitespace-nowrap min-w-[130px]">Trạng thái</Th>
                <Th className="whitespace-nowrap min-w-[160px]">Lý do nộp</Th>
                <Th className="whitespace-nowrap min-w-[100px] text-center">Điểm</Th>
                <Th className="whitespace-nowrap min-w-[150px]">Thời điểm nộp</Th>
                <Th className="whitespace-nowrap text-right min-w-[120px]">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((attempt) => (
                <tr key={attempt.attemptId} className="hover:bg-[var(--surface-hover)] group">
                  <Td className="font-medium min-w-[200px]">
                    {attempt.isGuest ? (
                      <Badge className="bg-[var(--surface-hover)] text-[var(--muted-foreground)] border-[var(--border)] whitespace-nowrap shrink-0">
                        Khách
                      </Badge>
                    ) : (
                      <div>
                        <p className="font-semibold text-[var(--foreground)] whitespace-nowrap">{attempt.studentName}</p>
                        {attempt.studentEmail && (
                          <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap font-mono">{attempt.studentEmail}</p>
                        )}
                      </div>
                    )}
                  </Td>
                  <Td className="min-w-[220px] text-[var(--foreground)] font-medium">{attempt.examTitle}</Td>
                  <Td className="whitespace-nowrap min-w-[120px] text-[var(--muted-foreground)]">{attempt.subjectName}</Td>
                  <Td className="whitespace-nowrap min-w-[130px]">
                    {attempt.status === "submitted" && (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 whitespace-nowrap shrink-0">
                        {formatAttemptStatus(attempt.status)}
                      </Badge>
                    )}
                    {attempt.status === "auto_submitted" && (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 whitespace-nowrap shrink-0">
                        {formatAttemptStatus(attempt.status)}
                      </Badge>
                    )}
                    {attempt.status === "expired" && (
                      <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 whitespace-nowrap shrink-0">
                        {formatAttemptStatus(attempt.status)}
                      </Badge>
                    )}
                    {attempt.status === "in_progress" && (
                      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 whitespace-nowrap shrink-0">
                        {formatAttemptStatus(attempt.status)}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-xs whitespace-nowrap min-w-[160px] text-[var(--muted-foreground)]">{formatSubmitReason(attempt.submitReason)}</Td>
                  <Td className="font-bold text-[var(--foreground)] whitespace-nowrap min-w-[100px] text-center">
                    {attempt.score !== null && attempt.maxScore !== null
                      ? `${attempt.score} / ${attempt.maxScore}`
                      : "-"}
                  </Td>
                  <Td className="text-xs whitespace-nowrap min-w-[150px] text-[var(--muted-foreground)]">{formatDateTime(attempt.submittedAt)}</Td>
                  <Td className="whitespace-nowrap text-right min-w-[120px]">
                    <Button variant="outline" size="sm" className="whitespace-nowrap shrink-0 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl" asChild>
                      <Link href={`/admin/attempts/${attempt.attemptId}`}>
                        Xem chi tiết
                      </Link>
                    </Button>
                  </Td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-8 text-center text-[var(--muted-foreground)]">
                    Chưa có lượt thi nào.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--divider)] p-4 text-xs text-[var(--muted-foreground)]">
              <p>
                Trang {data.page} / {data.totalPages} — Tổng cộng {data.total} lượt thi.
              </p>
              <div className="flex gap-2">
                {data.page > 1 && (
                  <Button variant="outline" size="sm" asChild className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                    <Link
                      href={`/admin/attempts?q=${encodeURIComponent(params.q || "")}&subjectId=${params.subjectId || "all"}&examId=${params.examId || "all"}&status=${params.status || "all"}&submitReason=${params.submitReason || "all"}&page=${data.page - 1}`}
                    >
                      Trang trước
                    </Link>
                  </Button>
                )}
                {data.page < data.totalPages && (
                  <Button variant="outline" size="sm" asChild className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                    <Link
                      href={`/admin/attempts?q=${encodeURIComponent(params.q || "")}&subjectId=${params.subjectId || "all"}&examId=${params.examId || "all"}&status=${params.status || "all"}&submitReason=${params.submitReason || "all"}&page=${data.page + 1}`}
                    >
                      Trang sau
                    </Link>
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
