"use client";

import Link from "next/link";
import { CheckCircle2, HelpCircle, XCircle, Trophy, ArrowLeft, BookOpen, Clock, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentAttemptResult } from "@/lib/exams/attempts";

interface ExamResultUIProps {
  result: StudentAttemptResult;
}

export function formatSubmitReasonText(reason: StudentAttemptResult["submit_reason"]): string {
  switch (reason) {
    case "student_submit":
      return "Bài thi đã được nộp thành công";
    case "time_expired":
      return "Bài thi đã được tự động nộp do hết giờ";
    case "fullscreen_violation":
      return "Bài thi đã bị nộp tự động do vi phạm toàn màn hình";
    case "account_locked":
      return "Bài thi đã được nộp do tài khoản bị khóa";
    case "system_recovery":
      return "Bài thi đã được nộp do hệ thống khôi phục";
    default:
      return "Bài thi đã được nộp";
  }
}

export function formatDurationText(startedAt: string, submittedAt: string | null): string {
  if (!submittedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(submittedAt).getTime();
  const diffMs = Math.max(0, end - start);
  const diffSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  if (minutes === 0) {
    return `${seconds} giây`;
  }
  if (seconds === 0) {
    return `${minutes} phút`;
  }
  return `${minutes} phút ${seconds} giây`;
}

export function ExamResultUI({ result }: ExamResultUIProps) {
  const formattedSubmittedAt = result.submitted_at
    ? new Date(result.submitted_at).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  const durationText = formatDurationText(result.started_at, result.submitted_at);
  const reasonBannerText = formatSubmitReasonText(result.submit_reason);

  const correctAnswers = result.correct_answers ?? 0;
  const wrongAnswers = result.wrong_answers ?? 0;
  const blankAnswers = result.blank_answers ?? 0;
  const totalQuestions = result.questions_detail
    ? result.questions_detail.length
    : correctAnswers + wrongAnswers + blankAnswers;
  const correctRate = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 py-6 px-4 pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
          {result.is_guest ? (
            <Link href="/exams">
              <ArrowLeft className="mr-2 h-4 w-4" /> Về thư viện đề thi
            </Link>
          ) : (
            <Link href="/student/history">
              <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại lịch sử
            </Link>
          )}
        </Button>
        <span className="text-xs text-[var(--muted-foreground)] font-medium">Kết quả bài thi</span>
      </div>

      {/* Guest Banner Notice */}
      {result.is_guest && (
        <Card className="border-blue-500/30 bg-blue-500/10 shadow-lg rounded-2xl">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Bạn đang làm bài với tư cách <strong>Người dùng khách</strong>. Hãy đăng nhập với Google để lưu lại lịch sử làm bài và theo dõi tiến độ luyện thi!
              </p>
            </div>
            <Button size="sm" asChild className="shrink-0 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
              <Link href="/login">Đăng ký tài khoản</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Result Summary Card */}
      <Card className="border-[var(--border)] bg-[var(--card)] shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-lg">
            <Trophy className="h-8 w-8" />
          </div>

          <div>
            <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {reasonBannerText}
            </span>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-[var(--foreground)]">
              {result.exam_title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--muted-foreground)] mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Nộp lúc: {formattedSubmittedAt}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Thời gian làm bài: {durationText}
              </span>
            </div>
          </div>

          {/* Score Summary Grid */}
          {result.show_score_after_submit && (
            <div className="space-y-3 pt-4 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-5 text-center shadow-md">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Điểm số đạt được</p>
                <p className="text-3xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {result.score ?? 0}
                  <span className="text-base font-normal text-[var(--muted-foreground)]"> / {result.max_score ?? 0}</span>
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Tỷ lệ đúng: <span className="font-bold text-[var(--foreground)]">{correctRate}%</span></p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Số câu đúng</span>
                  </div>
                  <p className="text-xl font-extrabold text-[var(--foreground)] mt-1">
                    {correctAnswers}
                  </p>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1 text-xs text-rose-700 dark:text-rose-400 font-medium">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Số câu sai</span>
                  </div>
                  <p className="text-xl font-extrabold text-[var(--foreground)] mt-1">
                    {wrongAnswers}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Số câu bỏ trống</span>
                  </div>
                  <p className="text-xl font-extrabold text-[var(--foreground)] mt-1">
                    {blankAnswers}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-3 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Tổng số câu</span>
                  </div>
                  <p className="text-xl font-extrabold text-[var(--foreground)] mt-1">
                    {totalQuestions}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {result.is_guest ? (
          <Button variant="outline" asChild className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
            <Link href="/exams">
              <ArrowLeft className="mr-2 h-4 w-4" /> Về thư viện đề thi
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
            <Link href="/student/history">
              <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại lịch sử làm bài
            </Link>
          </Button>
        )}
        <Button variant="default" asChild className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
          <Link href="/exams">
            <BookOpen className="mr-2 h-4 w-4" /> Xem danh sách đề thi
          </Link>
        </Button>
      </div>

      {/* Notice when show_answers_after_submit is false */}
      {!result.show_answers_after_submit && (
        <Card className="border-amber-500/30 bg-amber-500/10 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Đáp án chi tiết của bài thi này chưa được mở.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Question Details & Review (Only when show_answers_after_submit is true) */}
      {result.show_answers_after_submit && result.questions_detail && result.questions_detail.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Chi tiết bài làm</h2>

          {result.questions_detail.map((q, idx) => {
            const isUserCorrect = q.selected_option_id === q.correct_option_id && Boolean(q.selected_option_id);
            const isUserBlank = !q.selected_option_id;

            return (
              <Card key={q.question_id} className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-md">
                <CardHeader className="pb-3 border-b border-[var(--divider)]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-[var(--foreground)]">
                      <span>Câu {idx + 1}</span>
                      <span className="text-xs text-[var(--muted-foreground)] font-normal">({q.score} điểm)</span>
                    </CardTitle>

                    {result.show_score_after_submit && (
                      <div>
                        {isUserCorrect ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Đúng
                          </span>
                        ) : isUserBlank ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                            <HelpCircle className="h-3.5 w-3.5" /> Chưa làm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5" /> Sai
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  <p className="text-sm font-medium text-[var(--foreground)] whitespace-pre-line">{q.content}</p>

                  {q.image_path && (
                    <div className="my-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-2">
                      {/* eslint-disable-next-html-element-suppression */}
                      <img
                        src={q.image_path}
                        alt={`Hình minh họa câu ${idx + 1}`}
                        className="max-h-80 object-contain mx-auto rounded-lg"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = q.selected_option_id === opt.id;
                      const isCorrect = q.correct_option_id === opt.id;

                      let optionBorder = "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]";
                      if (isCorrect) {
                        optionBorder = "border-emerald-500 bg-emerald-500/15 text-[var(--foreground)] font-semibold shadow-xs";
                      } else if (isSelected && !isCorrect) {
                        optionBorder = "border-rose-500 bg-rose-500/15 text-[var(--foreground)] font-semibold shadow-xs";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm ${optionBorder}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : isSelected
                                ? "bg-rose-600 text-white"
                                : "bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]"
                            }`}>
                              {letter}
                            </span>
                            <span>{opt.content}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-[11px] font-semibold text-[var(--muted-foreground)] bg-[var(--surface-hover)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                                Bạn chọn
                              </span>
                            )}
                            {isCorrect && (
                              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                Đáp án đúng
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {result.show_solutions_after_submit && q.explanation && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs sm:text-sm text-blue-900 dark:text-blue-200 space-y-1">
                      <p className="font-bold text-blue-600 dark:text-blue-400">💡 Lời giải chi tiết:</p>
                      <p className="whitespace-pre-line leading-relaxed text-[var(--foreground)]">{q.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
