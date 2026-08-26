"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Calendar, CheckCircle2, Eye, BookOpen, ArrowUpDown, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PaginatedStudentHistory, HistoryFilter, HistorySort } from "@/lib/exams/history-queries";

interface StudentHistoryUIProps {
  historyData: PaginatedStudentHistory;
  currentFilter: HistoryFilter;
  currentSort: HistorySort;
}

export function StudentHistoryUI({ historyData, currentFilter, currentSort }: StudentHistoryUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (filter: HistoryFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    params.set("page", "1");
    router.push(`/student/history?${params.toString()}`);
  };

  const handleSortChange = (sort: HistorySort) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.set("page", "1");
    router.push(`/student/history?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/student/history?${params.toString()}`);
  };

  const filterOptions: { key: HistoryFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "submitted", label: "Đã nộp" },
    { key: "time_expired", label: "Hết thời gian" },
    { key: "fullscreen_violation", label: "Vi phạm toàn màn hình" },
  ];

  const sortOptions: { key: HistorySort; label: string }[] = [
    { key: "newest", label: "Mới nhất" },
    { key: "oldest", label: "Cũ nhất" },
    { key: "highest_score", label: "Điểm cao nhất" },
    { key: "lowest_score", label: "Điểm thấp nhất" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--divider)] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">Lịch sử làm bài</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Theo dõi và xem lại kết quả các bài thi đã thực hiện.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
          <Link href="/exams">
            <BookOpen className="mr-2 h-4 w-4" /> Danh sách đề thi
          </Link>
        </Button>
      </div>

      {/* Filter and Sort Toolbar */}
      <Card className="border-[var(--border)] bg-[var(--card)] shadow-md">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5" /> Lọc:
            </span>
            {filterOptions.map((opt) => {
              const active = currentFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleFilterChange(opt.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer border ${
                    active
                      ? "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/40 shadow-xs"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" /> Sắp xếp:
            </span>
            <select
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value as HistorySort)}
              className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-xs focus:border-[var(--primary)] focus:outline-none"
            >
              {sortOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* History Items List */}
      {historyData.items.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-[var(--border)] bg-[var(--card)]/60 rounded-2xl">
          <CardContent className="space-y-3 pt-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--muted-foreground)]">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              {currentFilter !== "all" ? "Không tìm thấy kết quả phù hợp bộ lọc." : "Bạn chưa làm bài thi nào."}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
              {currentFilter !== "all"
                ? "Vui lòng thử thay đổi bộ lọc hoặc chọn tất cả lịch sử."
                : "Hãy chọn một bài thi để bắt đầu luyện tập."}
            </p>
            <div className="pt-2">
              {currentFilter !== "all" ? (
                <Button variant="outline" size="sm" onClick={() => handleFilterChange("all")} className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                  Xóa bộ lọc
                </Button>
              ) : (
                <Button asChild size="sm" className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
                  <Link href="/exams">Xem danh sách đề thi</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {historyData.items.map((item) => {
            const isAutoSubmitted = item.status === "auto_submitted";

            return (
              <Card key={item.id} className="transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--card-hover)] border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-sm">
                <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          isAutoSubmitted
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {item.statusLabel}
                      </span>
                      {item.submitReasonLabel && (
                        <span className="text-xs font-medium text-[var(--muted-foreground)] bg-[var(--surface-hover)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                          Lý do: {item.submitReasonLabel}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[var(--foreground)]">{item.examTitle}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> {item.formattedDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> {item.durationText}
                      </span>
                      {item.showScoreAfterSubmit && item.correctAnswers !== null && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {item.correctAnswers}/{item.totalQuestions} câu đúng
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Score & Link */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-[var(--divider)]">
                    {item.showScoreAfterSubmit ? (
                      <div className="text-left md:text-right">
                        <p className="text-xs text-[var(--muted-foreground)]">Điểm số</p>
                        <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {item.score ?? 0}
                          <span className="text-xs font-normal text-[var(--muted-foreground)]"> / {item.maxScore ?? 0}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="text-left md:text-right text-xs italic text-[var(--muted-foreground)]">Điểm chưa công bố</div>
                    )}

                    <Button asChild variant="outline" size="sm" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                      <Link href={`/attempts/${item.id}/result`}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Xem kết quả
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {historyData.totalPages > 1 && (
        <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-md">
          <CardContent className="p-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={historyData.page <= 1}
              onClick={() => handlePageChange(historyData.page - 1)}
              className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Trước
            </Button>

            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              Trang {historyData.page} / {historyData.totalPages} (Tổng {historyData.total} bài làm)
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={historyData.page >= historyData.totalPages}
              onClick={() => handlePageChange(historyData.page + 1)}
              className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              Sau <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
