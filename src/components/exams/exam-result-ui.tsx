"use client";

import Link from "next/link";
import { CheckCircle2, HelpCircle, XCircle, Trophy, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentAttemptResult } from "@/lib/exams/attempts";

interface ExamResultUIProps {
  result: StudentAttemptResult;
}

export function ExamResultUI({ result }: ExamResultUIProps) {
  const isAutoSubmitted = result.status === "auto_submitted";
  const formattedSubmittedAt = result.submitted_at
    ? new Date(result.submitted_at).toLocaleString("vi-VN")
    : "—";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 py-6 px-4">
      {/* Top Banner Header */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-slate-900 shadow-sm">
        <CardContent className="p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
            <Trophy className="h-8 w-8" />
          </div>

          <div>
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              {isAutoSubmitted ? "Bài thi đã được tự động nộp do hết giờ" : "Bài thi đã được nộp thành công"}
            </span>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {result.exam_title}
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Thời gian nộp: {formattedSubmittedAt}
            </p>
          </div>

          {/* Score Summary Cards */}
          {result.show_score_after_submit && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-2xl mx-auto">
              <div className="rounded-lg border bg-white p-3 text-center dark:bg-slate-900 shadow-xs">
                <p className="text-xs text-[var(--muted-foreground)]">Điểm số</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {result.score ?? 0}
                  <span className="text-xs font-normal text-slate-500"> / {result.max_score ?? 0}</span>
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3 text-center dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Số câu đúng</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {result.correct_answers ?? 0}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3 text-center dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Số câu sai</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {result.wrong_answers ?? 0}
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3 text-center dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Bỏ trống</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {result.blank_answers ?? 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/exams">
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách đề thi
          </Link>
        </Button>
        <Button variant="default" asChild>
          <Link href="/student">
            <BookOpen className="mr-2 h-4 w-4" /> Về trang cá nhân
          </Link>
        </Button>
      </div>

      {/* Answer & Explanation Details if exam config allows */}
      {result.questions_detail && result.questions_detail.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold">Chi tiết đáp án & Lời giải</h2>

          {result.questions_detail.map((q, idx) => {
            const isUserCorrect = q.selected_option_id === q.correct_option_id && Boolean(q.selected_option_id);
            const isUserBlank = !q.selected_option_id;

            return (
              <Card key={q.question_id} className="shadow-xs">
                <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span>Câu {idx + 1}</span>
                      <span className="text-xs text-[var(--muted-foreground)] font-normal">({q.score} điểm)</span>
                    </CardTitle>

                    {result.show_score_after_submit && (
                      <div>
                        {isUserCorrect && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Đúng
                          </span>
                        )}
                        {!isUserCorrect && !isUserBlank && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                            <XCircle className="h-3.5 w-3.5" /> Sai
                          </span>
                        )}
                        {isUserBlank && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                            <HelpCircle className="h-3.5 w-3.5" /> Bỏ trống
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  <p className="text-sm font-medium leading-relaxed">{q.content}</p>

                  {q.image_path && (
                    <div className="my-2 overflow-hidden rounded-md border">
                      {/* eslint-disable-next-html-element-suppression */}
                      <img src={q.image_path} alt={`Minh họa câu ${idx + 1}`} className="max-h-80 object-contain" />
                    </div>
                  )}

                  {/* Options display */}
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = q.selected_option_id === opt.id;
                      const isCorrect = q.correct_option_id === opt.id || opt.is_correct;

                      let style = "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900";
                      if (result.show_answers_after_submit) {
                        if (isCorrect) {
                          style = "border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold dark:bg-emerald-950 dark:text-emerald-100";
                        } else if (isSelected && !isCorrect) {
                          style = "border-red-300 bg-red-50 text-red-900 font-semibold dark:bg-red-950 dark:text-red-100";
                        }
                      }

                      return (
                        <div key={opt.id} className={`flex items-center gap-3 rounded-md border p-3 text-sm ${style}`}>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt.content}</span>
                          {isSelected && <span className="text-xs text-slate-500 font-normal">(Đáp án bạn chọn)</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Solution Explanation if allowed */}
                  {result.show_solutions_after_submit && q.explanation && (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 space-y-1">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">Lời giải chi tiết:</p>
                      <p className="leading-relaxed whitespace-pre-line">{q.explanation}</p>
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
