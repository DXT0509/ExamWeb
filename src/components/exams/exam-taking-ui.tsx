"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Flag, Loader2, Save } from "lucide-react";
import { QuestionNavigator, type QuestionNavItem } from "@/components/exams/question-navigator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FullscreenViolationOverlay } from "@/components/exams/fullscreen-violation-overlay";
import {
  recordExamEventAction,
  resolveExamEventAction,
  saveAnswerAction,
  submitAttemptAction,
  type StudentAttemptPayload,
  type StudentExamQuestion,
} from "@/lib/exams/attempts";

interface FlatQuestion extends StudentExamQuestion {
  globalIndex: number;
  sectionTitle: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ExamTakingUIProps {
  initialPayload: StudentAttemptPayload;
}

export function ExamTakingUI({ initialPayload }: ExamTakingUIProps) {
  const router = useRouter();

  // 1. Flatten all questions across sections
  const flatQuestions: FlatQuestion[] = useMemo(() => {
    let count = 0;
    const result: FlatQuestion[] = [];
    initialPayload.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        count += 1;
        result.push({
          ...q,
          globalIndex: count,
          sectionTitle: sec.title,
        });
      });
    });
    return result;
  }, [initialPayload]);

  // 2. Answer State: Map<questionId, { selectedOptionId: string | null; isMarked: boolean }>
  const [userAnswers, setUserAnswers] = useState<
    Record<string, { selectedOptionId: string | null; isMarked: boolean }>
  >(() => {
    const initialMap: Record<string, { selectedOptionId: string | null; isMarked: boolean }> = {};
    initialPayload.answers.forEach((ans) => {
      initialMap[ans.question_id] = {
        selectedOptionId: ans.selected_option_id,
        isMarked: ans.is_marked,
      };
    });
    return initialMap;
  });

  const [currentIndex, setCurrentIndex] = useState(1); // 1-indexed
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // 3. Fullscreen Guard State
  const [isViolationOverlayOpen, setIsViolationOverlayOpen] = useState(false);
  const [violationStartedAt, setViolationStartedAt] = useState<number | null>(null);
  const [isAutoSubmittingOnViolation, setIsAutoSubmittingOnViolation] = useState(false);

  // 3. Timer State
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const deadlineMs = new Date(initialPayload.deadline_at).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
  });

  // Handle Submit Execution
  const handlePerformSubmit = useCallback(
    async (reason: "student_submit" | "time_expired" | "fullscreen_violation" = "student_submit") => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await submitAttemptAction({
        attemptId: initialPayload.attempt_id,
        idempotencyKey: idempotencyKeyRef.current,
        submitReason: reason,
      });

      if (!res.success) {
        setIsSubmitting(false);
        setIsAutoSubmittingOnViolation(false);
        setSubmitError(res.error || "Không thể nộp bài. Vui lòng thử lại.");
        return;
      }

      // Redirect to result page
      router.push(`/attempts/${initialPayload.attempt_id}/result`);
    },
    [initialPayload.attempt_id, isSubmitting, router]
  );

  // Timer Tick
  useEffect(() => {
    if (initialPayload.status !== "in_progress") return;

    const interval = setInterval(() => {
      const deadlineMs = new Date(initialPayload.deadline_at).getTime();
      const diffSec = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        handlePerformSubmit("time_expired");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [initialPayload.deadline_at, initialPayload.status, handlePerformSubmit]);

  // Fullscreen Exit & Visibility Change Listener
  const triggerViolation = useCallback(
    async (eventType: "fullscreen_exit" | "visibility_hidden") => {
      if (isSubmitting || initialPayload.status !== "in_progress") return;

      setViolationStartedAt((prev) => prev ?? Date.now());
      setIsViolationOverlayOpen(true);

      await recordExamEventAction({
        attemptId: initialPayload.attempt_id,
        eventType,
      });
    },
    [initialPayload.attempt_id, initialPayload.status, isSubmitting]
  );

  useEffect(() => {
    if (initialPayload.status !== "in_progress" || !initialPayload.fullscreen_required) return;

    const handleFullscreenChange = () => {
      if (document.fullscreenElement === null) {
        triggerViolation("fullscreen_exit");
      } else {
        // Returned to fullscreen by browser shortcut or button
        setIsViolationOverlayOpen(false);
        setViolationStartedAt(null);
        resolveExamEventAction(initialPayload.attempt_id);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        triggerViolation("visibility_hidden");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial check on mount: if fullscreen_required and not currently in fullscreen, trigger violation
    let mountTimer: NodeJS.Timeout | null = null;
    if (typeof document !== "undefined" && document.fullscreenElement === null) {
      mountTimer = setTimeout(() => {
        triggerViolation("fullscreen_exit");
      }, 0);
    }

    return () => {
      if (mountTimer) clearTimeout(mountTimer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialPayload.attempt_id, initialPayload.fullscreen_required, initialPayload.status, triggerViolation]);

  const handleReturnToFullscreen = useCallback(async () => {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
    if (document.fullscreenElement !== null) {
      setIsViolationOverlayOpen(false);
      setViolationStartedAt(null);
      await resolveExamEventAction(initialPayload.attempt_id);
    }
  }, [initialPayload.attempt_id]);

  const handleAutoSubmitOnViolation = useCallback(async () => {
    if (isSubmitting || isAutoSubmittingOnViolation) return;
    setIsAutoSubmittingOnViolation(true);
    await handlePerformSubmit("fullscreen_violation");
  }, [handlePerformSubmit, isAutoSubmittingOnViolation, isSubmitting]);

  // Format Timer String
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Debounce save queue
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback(
    (questionId: string, selectedOptionId: string | null, isMarked: boolean) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaveStatus("saving");
      setSaveErrorMessage(null);

      saveTimeoutRef.current = setTimeout(async () => {
        const res = await saveAnswerAction({
          attemptId: initialPayload.attempt_id,
          questionId,
          selectedOptionId,
          isMarked,
        });

        if (res.success) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
          setSaveErrorMessage(res.error || "Không thể lưu đáp án.");
        }
      }, 400);
    },
    [initialPayload.attempt_id]
  );

  // Current Question
  const currentQuestion: FlatQuestion | undefined = flatQuestions[currentIndex - 1] ?? flatQuestions[0];
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id] : undefined;

  // Handle Option Select
  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion || isSubmitting) return;

    const newOptionId = currentAnswer?.selectedOptionId === optionId ? null : optionId;
    const isMarked = currentAnswer?.isMarked || false;

    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        selectedOptionId: newOptionId,
        isMarked,
      },
    }));

    triggerSave(currentQuestion.id, newOptionId, isMarked);
  };

  // Handle Toggle Mark
  const handleToggleMark = () => {
    if (!currentQuestion || isSubmitting) return;

    const selectedOptionId = currentAnswer?.selectedOptionId || null;
    const newIsMarked = !currentAnswer?.isMarked;

    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        selectedOptionId,
        isMarked: newIsMarked,
      },
    }));

    triggerSave(currentQuestion.id, selectedOptionId, newIsMarked);
  };

  // Nav Items for Navigator
  const navItems: QuestionNavItem[] = useMemo(() => {
    return flatQuestions.map((q) => {
      const ans = userAnswers[q.id];
      return {
        id: q.id,
        index: q.globalIndex,
        sectionTitle: q.sectionTitle,
        isAnswered: Boolean(ans?.selectedOptionId),
        isMarked: Boolean(ans?.isMarked),
      };
    });
  }, [flatQuestions, userAnswers]);

  // Unanswered count
  const answeredCount = useMemo(() => {
    return Object.values(userAnswers).filter((a) => Boolean(a.selectedOptionId)).length;
  }, [userAnswers]);

  const unansweredCount = flatQuestions.length - answeredCount;

  if (flatQuestions.length === 0 || !currentQuestion) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold">Không có câu hỏi</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">Đề thi này chưa có nội dung câu hỏi.</p>
        <Button className="mt-6" onClick={() => router.push("/exams")}>Quay lại danh sách đề thi</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:bg-slate-900/95 shadow-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Đang làm bài thi</p>
            <h1 className="font-semibold text-base md:text-lg line-clamp-1">{initialPayload.exam_title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 font-mono font-bold text-base px-3 py-1.5 rounded-md border ${
                remainingSeconds < 300
                  ? "bg-red-50 text-red-600 border-red-200 animate-pulse dark:bg-red-950 dark:text-red-300"
                  : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Autosave Status */}
            <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu
                </span>
              )}
              {saveStatus === "error" && (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {saveErrorMessage || "Lưu thất bại"}
                </span>
              )}
              {saveStatus === "idle" && (
                <span className="inline-flex items-center gap-1">
                  <Save className="h-3.5 w-3.5" /> Đã đồng bộ
                </span>
              )}
            </div>

            {/* Submit Button */}
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={() => setIsSubmitDialogOpen(true)}
              disabled={isSubmitting}
            >
              Nộp bài
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        {/* Left Column: Question Area */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {currentQuestion.sectionTitle}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Đã trả lời {answeredCount}/{flatQuestions.length} câu
              </p>
            </div>

            <Button
              variant={currentAnswer?.isMarked ? "default" : "outline"}
              size="sm"
              onClick={handleToggleMark}
              className={currentAnswer?.isMarked ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            >
              <Flag className="h-4 w-4 mr-1.5" />
              {currentAnswer?.isMarked ? "Đã đánh dấu" : "Đánh dấu"}
            </Button>
          </div>

          {/* Question Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span>Câu {currentQuestion.globalIndex}</span>
                  <span className="text-xs font-normal text-[var(--muted-foreground)]">
                    ({currentQuestion.score} điểm)
                  </span>
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              {/* Question Text */}
              <div className="text-base font-medium leading-relaxed whitespace-pre-line text-slate-900 dark:text-slate-100">
                {currentQuestion.content}
              </div>

              {/* Question Image if present */}
              {currentQuestion.image_path && (
                <div className="my-4 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-html-element-suppression */}
                  <img
                    src={currentQuestion.image_path}
                    alt={`Hình minh họa câu ${currentQuestion.globalIndex}`}
                    className="max-h-96 object-contain"
                  />
                </div>
              )}

              {/* Options */}
              <div className="space-y-3 pt-2" role="radiogroup" aria-label={`Đáp án cho câu ${currentQuestion.globalIndex}`}>
                {currentQuestion.options.map((opt, idx) => {
                  const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
                  const isSelected = currentAnswer?.selectedOptionId === opt.id;

                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`flex min-h-12 cursor-pointer items-center gap-3.5 rounded-lg border p-4 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 font-semibold"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        checked={isSelected}
                        onChange={() => {}} // handled by label onClick
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {optionLetter}
                      </span>
                      <span className="flex-1 text-slate-800 dark:text-slate-200">{opt.content}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Previous / Next Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(1, prev - 1))}
              disabled={currentIndex <= 1}
            >
              Câu trước
            </Button>

            <span className="text-xs text-[var(--muted-foreground)]">
              {currentIndex} / {flatQuestions.length}
            </span>

            <Button
              variant="default"
              onClick={() => setCurrentIndex((prev) => Math.min(flatQuestions.length, prev + 1))}
              disabled={currentIndex >= flatQuestions.length}
            >
              Câu tiếp theo
            </Button>
          </div>
        </section>

        {/* Right Column: Question Navigator */}
        <aside className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Điều hướng câu hỏi</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <QuestionNavigator
                items={navItems}
                currentIndex={currentIndex}
                onSelectQuestion={(idx) => setCurrentIndex(idx)}
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Confirmation Modal for Submitting */}
      {isSubmitDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg dark:bg-slate-900 space-y-4">
            <h3 className="text-lg font-bold">Xác nhận nộp bài</h3>

            {unansweredCount > 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Bạn còn <strong className="text-amber-600 font-semibold">{unansweredCount} câu chưa trả lời</strong>.
                Sau khi nộp bài, bạn sẽ không thể tiếp tục làm bài. Bạn có chắc chắn muốn nộp bài không?
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Bạn đã trả lời tất cả các câu hỏi. Sau khi nộp bài, bạn sẽ không thể tiếp tục chỉnh sửa đáp án.
              </p>
            )}

            {submitError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitDialogOpen(false);
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handlePerformSubmit("student_submit")}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang nộp bài...
                  </>
                ) : (
                  "Xác nhận nộp bài"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Violation Warning Overlay */}
      <FullscreenViolationOverlay
        visible={isViolationOverlayOpen && initialPayload.fullscreen_required}
        violationStartedAt={violationStartedAt}
        onReturnToFullscreen={handleReturnToFullscreen}
        onAutoSubmit={handleAutoSubmitOnViolation}
        isAutoSubmitting={isAutoSubmittingOnViolation}
      />
    </main>
  );
}
