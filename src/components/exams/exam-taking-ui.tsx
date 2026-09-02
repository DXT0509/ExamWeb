"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Flag, Loader2, Save, Check, X, Calculator, Info } from "lucide-react";
import { QuestionNavigator, type QuestionNavItem } from "@/components/exams/question-navigator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

interface AnswerState {
  selectedOptionId?: string | null;
  textAnswer?: string | null;
  subAnswers?: Record<string, boolean> | null;
  isMarked: boolean;
}

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

  // 2. Answer State
  const [userAnswers, setUserAnswers] = useState<Record<string, AnswerState>>(() => {
    const initialMap: Record<string, AnswerState> = {};
    initialPayload.answers.forEach((ans) => {
      initialMap[ans.question_id] = {
        selectedOptionId: ans.selected_option_id ?? null,
        textAnswer: ans.text_answer ?? null,
        subAnswers: ans.sub_answers ?? {},
        isMarked: ans.is_marked ?? false,
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

  // 4. Timer State
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

      router.replace(`/attempts/${initialPayload.attempt_id}/result`);
    },
    [initialPayload.attempt_id, isSubmitting, router]
  );

  // Timer Tick & Auto-Submit on Expire
  useEffect(() => {
    if (remainingSeconds <= 0) {
      const submitTimeout = setTimeout(() => {
        handlePerformSubmit("time_expired");
      }, 0);
      return () => clearTimeout(submitTimeout);
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            handlePerformSubmit("time_expired");
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handlePerformSubmit, remainingSeconds]);

  // Fullscreen & Tab Switch Violation Listeners
  useEffect(() => {
    if (!initialPayload.fullscreen_required) return;

    const handleFullscreenChange = async () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      if (!isFullscreen) {
        if (!isViolationOverlayOpen) {
          setIsViolationOverlayOpen(true);
          setViolationStartedAt(Date.now());
          await recordExamEventAction({
            attemptId: initialPayload.attempt_id,
            eventType: "fullscreen_exit",
          });
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        if (!isViolationOverlayOpen) {
          setIsViolationOverlayOpen(true);
          setViolationStartedAt(Date.now());
          await recordExamEventAction({
            attemptId: initialPayload.attempt_id,
            eventType: "visibility_hidden",
          });
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialPayload.attempt_id, initialPayload.fullscreen_required, isViolationOverlayOpen]);

  // Violation Recovery / Re-enter Fullscreen
  const handleReturnToFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsViolationOverlayOpen(false);
      setViolationStartedAt(null);
      await resolveExamEventAction(initialPayload.attempt_id);
    } catch {
      // Ignored
    }
  };

  // Violation Auto-Submit
  const handleAutoSubmitOnViolation = async () => {
    setIsAutoSubmittingOnViolation(true);
    await handlePerformSubmit("fullscreen_violation");
  };

  // Autosave Answer Logic
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = useCallback(
    (questionId: string, answerPayload: Partial<AnswerState>) => {
      setSaveStatus("saving");
      setSaveErrorMessage(null);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const res = await saveAnswerAction({
          attemptId: initialPayload.attempt_id,
          questionId,
          selectedOptionId: answerPayload.selectedOptionId ?? undefined,
          textAnswer: answerPayload.textAnswer ?? undefined,
          subAnswers: answerPayload.subAnswers ?? undefined,
          isMarked: answerPayload.isMarked ?? false,
        });

        if (res.success) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
          setSaveErrorMessage(res.error || "Lỗi lưu đáp án");
        }
      }, 300);
    },
    [initialPayload.attempt_id]
  );

  // Handlers for Answer Selection
  const handleSelectOption = (optionId: string) => {
    const currentQ = flatQuestions[currentIndex - 1];
    if (!currentQ) return;

    const currentMarked = userAnswers[currentQ.id]?.isMarked || false;
    const nextState: AnswerState = {
      selectedOptionId: optionId,
      isMarked: currentMarked,
    };

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: nextState,
    }));

    triggerAutosave(currentQ.id, nextState);
  };

  const handleToggleSubAnswer = (optionId: string, value: boolean) => {
    const currentQ = flatQuestions[currentIndex - 1];
    if (!currentQ) return;

    const currentAns = userAnswers[currentQ.id];
    const prevSub = currentAns?.subAnswers || {};
    const nextSub = { ...prevSub, [optionId]: value };

    const nextState: AnswerState = {
      ...currentAns,
      subAnswers: nextSub,
      isMarked: currentAns?.isMarked || false,
    };

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: nextState,
    }));

    triggerAutosave(currentQ.id, nextState);
  };

  const handleTextAnswerChange = (text: string) => {
    const currentQ = flatQuestions[currentIndex - 1];
    if (!currentQ) return;

    const currentAns = userAnswers[currentQ.id];
    const nextState: AnswerState = {
      ...currentAns,
      textAnswer: text,
      isMarked: currentAns?.isMarked || false,
    };

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: nextState,
    }));

    triggerAutosave(currentQ.id, nextState);
  };

  const handleToggleMark = () => {
    const currentQ = flatQuestions[currentIndex - 1];
    if (!currentQ) return;

    const currentAns = userAnswers[currentQ.id];
    const nextMarked = !currentAns?.isMarked;

    const nextState: AnswerState = {
      ...currentAns,
      isMarked: nextMarked,
    };

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: nextState,
    }));

    triggerAutosave(currentQ.id, nextState);
  };

  // Check if a question is answered
  const isQuestionAnswered = useCallback(
    (q: FlatQuestion) => {
      const ans = userAnswers[q.id];
      if (!ans) return false;
      const qType = q.question_type || "multiple_choice";

      if (qType === "multiple_choice" || qType === "regular") {
        return Boolean(ans.selectedOptionId);
      }
      if (qType === "true_false_group") {
        const sub = ans.subAnswers || {};
        return q.options.length > 0 && q.options.every((opt) => sub[opt.id] !== undefined);
      }
      if (qType === "short_answer") {
        return Boolean(ans.textAnswer && ans.textAnswer.trim().length > 0);
      }
      return false;
    },
    [userAnswers]
  );

  // Navigation Items
  const navItems: QuestionNavItem[] = useMemo(() => {
    return flatQuestions.map((q) => ({
      id: q.id,
      index: q.globalIndex,
      sectionTitle: q.sectionTitle,
      isAnswered: isQuestionAnswered(q),
      isMarked: Boolean(userAnswers[q.id]?.isMarked),
    }));
  }, [flatQuestions, userAnswers, isQuestionAnswered]);

  const answeredCount = useMemo(() => {
    return flatQuestions.filter((q) => isQuestionAnswered(q)).length;
  }, [flatQuestions, isQuestionAnswered]);

  const unansweredCount = flatQuestions.length - answeredCount;
  const currentQuestion = flatQuestions[currentIndex - 1];
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id] : undefined;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (flatQuestions.length === 0 || !currentQuestion) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6 text-center text-[var(--foreground)]">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-[var(--foreground)]">Không có câu hỏi</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">Đề thi này chưa có nội dung câu hỏi.</p>
        <Button className="mt-6 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl" onClick={() => router.push("/exams")}>
          Quay lại danh sách đề thi
        </Button>
      </div>
    );
  }

  const isTfGroup = currentQuestion.question_type === "true_false_group";
  const isShortAnswer = currentQuestion.question_type === "short_answer";
  const isMcq = !isTfGroup && !isShortAnswer;

  return (
    <main className="min-h-screen bg-cyber-grid bg-[var(--background)] text-[var(--foreground)] pb-16 transition-colors duration-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md shadow-md">
        <div className="mx-auto flex min-h-18 w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse"></span> Đang làm bài thi
            </p>
            <h1 className="font-bold text-base md:text-lg text-[var(--foreground)] line-clamp-1">{initialPayload.exam_title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 font-mono font-bold text-base px-3.5 py-1.5 rounded-xl border ${
                remainingSeconds < 300
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse"
                  : "bg-[var(--surface)] border-[var(--border)] text-amber-600 dark:text-amber-400"
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
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {saveErrorMessage || "Lưu thất bại"}
                </span>
              )}
              {saveStatus === "idle" && (
                <span className="inline-flex items-center gap-1">
                  <Save className="h-3.5 w-3.5 text-[var(--primary)]" /> Đã đồng bộ
                </span>
              )}
            </div>

            {/* Submit Button */}
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25"
              onClick={() => setIsSubmitDialogOpen(true)}
              disabled={isSubmitting}
            >
              Nộp bài
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column: Question Area */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-md">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
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
              className={currentAnswer?.isMarked ? "bg-amber-500 hover:bg-amber-600 text-white rounded-xl" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"}
            >
              <Flag className="h-4 w-4 mr-1.5" />
              {currentAnswer?.isMarked ? "Đã đánh dấu" : "Đánh dấu"}
            </Button>
          </div>

          {/* Question Card */}
          <Card className="border-[var(--border)] bg-[var(--card)] shadow-lg rounded-2xl">
            <CardHeader className="pb-3 border-b border-[var(--divider)]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-[var(--foreground)]">
                  <span>Câu {currentQuestion.globalIndex}</span>
                  <span className="text-xs font-normal text-[var(--muted-foreground)]">
                    ({currentQuestion.score} điểm)
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)]">
                    {isTfGroup ? "Đúng / Sai" : isShortAnswer ? "Trả lời ngắn" : "Trắc nghiệm"}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              {/* Question Text */}
              <div className="text-base font-medium leading-relaxed whitespace-pre-line text-[var(--foreground)]">
                {currentQuestion.content}
              </div>

              {/* Question Image if present */}
              {currentQuestion.image_path && (
                <div className="my-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-2">
                  <img
                    src={currentQuestion.image_path}
                    alt={`Hình minh họa câu ${currentQuestion.globalIndex}`}
                    className="max-h-96 object-contain mx-auto rounded-lg"
                  />
                </div>
              )}

              {/* Mode 1: Multiple Choice Options */}
              {isMcq && (
                <div className="space-y-3 pt-2" role="radiogroup" aria-label={`Đáp án cho câu ${currentQuestion.globalIndex}`}>
                  {currentQuestion.options.map((opt, idx) => {
                    const optionLetter = String.fromCharCode(65 + idx);
                    const isSelected = currentAnswer?.selectedOptionId === opt.id;

                    return (
                      <label
                        key={opt.id}
                        className={`flex min-h-13 cursor-pointer items-center gap-3.5 rounded-xl border p-4 text-sm font-medium transition-all duration-200 select-none ${
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]/50 shadow-md shadow-blue-500/10"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={isSelected}
                          onChange={() => handleSelectOption(opt.id)}
                          className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
                        />
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isSelected ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]"
                        }`}>
                          {optionLetter}
                        </span>
                        <span className="flex-1">{opt.content}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Mode 2: True / False Group (4 Statements) */}
              {isTfGroup && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Chọn Đúng hoặc Sai cho mỗi ý khẳng định dưới đây:
                  </p>
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((opt, idx) => {
                      const letter = ["a", "b", "c", "d", "e"][idx] || `${idx + 1}`;
                      const subAns = currentAnswer?.subAnswers || {};
                      const selectedVal = subAns[opt.id];

                      return (
                        <div
                          key={opt.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-colors"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)]">
                              {letter}
                            </span>
                            <span className="text-sm text-[var(--foreground)] leading-relaxed">{opt.content}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSubAnswer(opt.id, true)}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                selectedVal === true
                                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                  : "border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted-foreground)] hover:border-emerald-500/50 hover:text-emerald-600"
                              )}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Đúng
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSubAnswer(opt.id, false)}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                selectedVal === false
                                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                                  : "border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted-foreground)] hover:border-rose-500/50 hover:text-rose-600"
                              )}
                            >
                              <X className="h-3.5 w-3.5" />
                              Sai
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode 3: Short Answer (Numeric / Fraction / Math Text) */}
              {isShortAnswer && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-semibold text-[var(--foreground)]">
                      Nhập câu trả lời của bạn:
                    </label>
                    {currentQuestion.tolerance !== undefined && currentQuestion.tolerance !== null && currentQuestion.tolerance > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        <Info className="h-3.5 w-3.5" />
                        Sai số cho phép: ± {currentQuestion.tolerance}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-hover)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] border border-[var(--border)]">
                        <Info className="h-3.5 w-3.5" />
                        Sai số: Không cho phép (Khớp chính xác)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="relative w-full max-w-sm">
                      <Input
                        type="text"
                        placeholder="Ví dụ: 1/2 hoặc 0.5 hoặc -3"
                        value={currentAnswer?.textAnswer ?? ""}
                        onChange={(e) => handleTextAnswerChange(e.target.value)}
                        className="h-12 text-base font-semibold font-mono bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)] rounded-xl pl-3"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 pt-1">
                    <Calculator className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      {currentQuestion.tolerance !== undefined && currentQuestion.tolerance !== null && currentQuestion.tolerance > 0
                        ? `Hệ thống chấp nhận phân số (1/2), số thập phân (0.5 hoặc 0,5) hoặc số âm (-2) với sai số chấp nhận tối đa ± ${currentQuestion.tolerance}.`
                        : "Hệ thống yêu cầu đáp án khớp giá trị chính xác (chấp nhận các cách viết tương đương như 1/2, 0.5 hoặc 0,5). Không cho phép sai số làm tròn."}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous / Next Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(1, prev - 1))}
              disabled={currentIndex <= 1}
              className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
            >
              Câu trước
            </Button>

            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              {currentIndex} / {flatQuestions.length}
            </span>

            <Button
              variant="default"
              onClick={() => setCurrentIndex((prev) => Math.min(flatQuestions.length, prev + 1))}
              disabled={currentIndex >= flatQuestions.length}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20"
            >
              Câu tiếp theo
            </Button>
          </div>
        </section>

        {/* Right Column: Question Navigator */}
        <aside className="space-y-4">
          <Card className="border-[var(--border)] bg-[var(--card)] shadow-lg rounded-2xl">
            <CardHeader className="pb-3 border-b border-[var(--divider)]">
              <CardTitle className="text-base font-bold text-[var(--foreground)]">Điều hướng câu hỏi</CardTitle>
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
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
            <h3 className="text-lg font-bold text-[var(--foreground)]">Xác nhận nộp bài</h3>

            {unansweredCount > 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Bạn còn <strong className="text-amber-600 dark:text-amber-400 font-semibold">{unansweredCount} câu chưa hoàn thành</strong>.
                Sau khi nộp bài, bạn sẽ không thể tiếp tục làm bài. Bạn có chắc chắn muốn nộp bài không?
              </p>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Bạn đã trả lời tất cả các câu hỏi. Sau khi nộp bài, bạn sẽ không thể tiếp tục chỉnh sửa đáp án.
              </p>
            )}

            {submitError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-600 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
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
                className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
              >
                Hủy
              </Button>
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 font-bold"
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
