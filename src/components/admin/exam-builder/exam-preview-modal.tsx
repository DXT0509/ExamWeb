"use client";

import { useState } from "react";
import { Eye, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SectionData } from "./builder-section-item";
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
                Đề thi chưa có phần thi nào.
              </div>
            ) : (
              activeSections.map((section, sIndex) => {
                const questions = section.questions.filter((q) => !q.deleted_at);
                return (
                  <div key={section.id} className="space-y-4">
                    <div className="border-b border-[var(--divider)] pb-2">
                      <h3 className="text-base font-bold text-[var(--foreground)]">
                        Phần {sIndex + 1}: {section.title}
                      </h3>
                      {section.description && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{section.description}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {questions.map((question, qIndex) => {
                        const options = question.question_options.filter((o) => !o.deleted_at);
                        return (
                          <div
                            key={question.id}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-sm text-[var(--foreground)]">
                                Câu {qIndex + 1}: {question.content}
                              </span>
                              <span className="shrink-0 rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground)] border border-[var(--border)]">
                                {question.score} điểm
                              </span>
                            </div>

                            {question.image_path && (
                              <div className="my-2">
                                <img
                                  src={question.image_path}
                                  alt={`Minh họa câu ${qIndex + 1}`}
                                  className="max-h-56 rounded-lg border border-[var(--border)] object-contain"
                                />
                              </div>
                            )}

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
