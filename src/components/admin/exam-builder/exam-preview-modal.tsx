"use client";

import { useState } from "react";
import { Eye, CheckCircle2, Check, X, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseQuestionImages } from "@/lib/exams/images";
import type { SectionData } from "./exam-builder";
import type { ExamMetaData } from "./meta-settings-modal";

interface ExamPreviewModalProps {
  exam: ExamMetaData;
  sections: SectionData[];
}

export function ExamPreviewModal({ exam, sections }: ExamPreviewModalProps) {
  const [open, setOpen] = useState(false);

  const activeSections = sections.filter((s) => !("deleted_at" in s && s.deleted_at));
  const totalQuestions = activeSections.reduce(
    (sum, s) => sum + s.questions.filter((q) => !q.deleted_at).length,
    0
  );
  const totalScore = activeSections.reduce(
    (sum, s) =>
      sum +
      s.questions
        .filter((q) => !q.deleted_at)
        .reduce((qSum, q) => qSum + (q.score || 0), 0),
    0
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
      >
        <Eye className="mr-1.5 h-4 w-4 text-[var(--muted-foreground)]" />
        <span>Xem trước</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-[var(--divider)] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-xl font-bold text-[var(--foreground)]">
                  {exam.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--muted-foreground)] mt-1">
                  Thời lượng: {exam.duration_minutes} phút · Tổng cộng: {totalQuestions} câu hỏi · Tổng điểm: {totalScore.toFixed(2).replace(/\.00$/, "")} điểm
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {activeSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                Đề thi chưa có câu hỏi nào.
              </div>
            ) : (
              activeSections.map((section) => {
                const questions = section.questions.filter((q) => !q.deleted_at);
                return (
                  <div key={section.id} className="space-y-4">
                    <div className="space-y-4">
                      {questions.map((question, qIndex) => {
                        const options = question.question_options.filter((o) => !o.deleted_at);
                        const isTf = question.question_type === "true_false_group";
                        const isShort = question.question_type === "short_answer";

                        return (
                          <div
                            key={question.id}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-sm text-[var(--foreground)]">
                                Câu {qIndex + 1}
                                {question.content && question.content !== "Nhập câu hỏi" ? `: ${question.content}` : ""}
                              </span>
                              <span className="shrink-0 rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground)] border border-[var(--border)]">
                                {question.score} điểm
                              </span>
                            </div>

                            {/* Question Images */}
                            {(() => {
                              const images = parseQuestionImages(question.image_path);
                              if (images.length === 0) return null;
                              return (
                                <div className="my-2 space-y-2">
                                  {images.map((imgUrl, imgIdx) => (
                                    <div key={imgIdx} className="overflow-hidden rounded-lg border border-[var(--border)] p-1 bg-[var(--surface)]">
                                      {images.length > 1 && (
                                        <div className="text-[10px] font-semibold text-[var(--muted-foreground)] px-1 mb-1">
                                          Hình {imgIdx + 1} / {images.length}
                                        </div>
                                      )}
                                      <img
                                        src={imgUrl}
                                        alt={`Minh họa câu ${qIndex + 1}${images.length > 1 ? ` (Ảnh ${imgIdx + 1})` : ""}`}
                                        className="w-full max-w-2xl h-auto rounded-md object-contain mx-auto"
                                        loading="lazy"
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Multiple Choice Preview */}
                            {!isTf && !isShort && (
                              <div className="grid gap-2 sm:grid-cols-2 pt-1">
                                {options.map((opt, oIndex) => {
                                  const letter = String.fromCharCode(65 + oIndex);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs ${
                                        opt.is_correct
                                          ? "border-emerald-500/40 bg-emerald-500/15 text-[var(--foreground)] font-semibold"
                                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                                      }`}
                                    >
                                      <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                          opt.is_correct
                                            ? "bg-emerald-600 text-white"
                                            : "bg-[var(--surface-hover)] text-[var(--foreground)]"
                                        }`}
                                      >
                                        {letter}
                                      </span>
                                      <span className="flex-1 break-words">{opt.content}</span>
                                      {opt.is_correct && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* True / False Group Preview */}
                            {isTf && (
                              <div className="space-y-2 pt-1">
                                {options.map((opt, oIndex) => {
                                  const letter = ["a", "b", "c", "d", "e"][oIndex] || `${oIndex + 1}`;
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs ${
                                        opt.is_correct
                                          ? "border-emerald-500/30 bg-emerald-500/5"
                                          : "border-rose-500/30 bg-rose-500/5"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[11px] font-bold">
                                          {letter}
                                        </span>
                                        <span className="text-[var(--foreground)]">{opt.content}</span>
                                      </div>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                          opt.is_correct
                                            ? "bg-emerald-600 text-white"
                                            : "bg-rose-600 text-white"
                                        }`}
                                      >
                                        {opt.is_correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                        {opt.is_correct ? "Đúng" : "Sai"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Short Answer Preview */}
                            {isShort && (
                              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs flex items-center justify-between">
                                <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                  <Calculator className="h-4 w-4" />
                                  Đáp án mẫu: <span className="font-mono text-sm">{question.correct_answer_raw || "Chưa có"}</span>
                                </span>
                                <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                                  Khớp chính xác 100%
                                </span>
                              </div>
                            )}

                            {question.explanation && (
                              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-900 dark:text-blue-200">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">💡 Lời giải: </span>
                                <span className="text-[var(--foreground)]">{question.explanation}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
