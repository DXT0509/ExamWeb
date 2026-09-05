"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Send,
  RotateCcw,
  Lock,
  Archive,
  Copy,
  Clock,
  Award,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cloneExamAction,
  markCorrectOptionAction,
  reorderContentAction,
  saveOptionAction,
  saveQuestionAction,
  softDeleteContentAction,
  transitionExamAction,
  updateExamAction,
} from "@/lib/exams/actions";
import { examStatusLabels } from "@/lib/exams/constants";
import { getScoringStrategy } from "@/lib/exams/scoring-strategies";
import { BuilderQuestionCard, type QuestionData } from "./builder-question-card";
import { ExamPreviewModal } from "./exam-preview-modal";
import { MetaSettingsModal, type ExamMetaData } from "./meta-settings-modal";
import type { OptionData } from "./builder-option-item";

type SelectItem = { id: string; name: string };

export interface SectionData {
  id: string;
  exam_id: string;
  title: string;
  description: string | null;
  position: number;
  deleted_at?: string | null;
  questions: QuestionData[];
}

interface ExamBuilderProps {
  exam: ExamMetaData & {
    subjects?: { id: string; name: string } | null;
    exam_categories?: { id: string; name: string } | null;
    exam_template?: string;
    scoring_strategy?: string;
  };
  sections: SectionData[];
  subjects: SelectItem[];
  categories: SelectItem[];
}

export function ExamBuilder({
  exam: initialExam,
  sections: initialSections,
  subjects,
  categories,
}: ExamBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [prevInitialExam, setPrevInitialExam] = useState(initialExam);
  const [exam, setExam] = useState(initialExam);

  if (prevInitialExam !== initialExam) {
    setPrevInitialExam(initialExam);
    setExam(initialExam);
  }

  const [prevInitialSections, setPrevInitialSections] = useState(initialSections);
  const [sections, setSections] = useState<SectionData[]>(initialSections);

  if (prevInitialSections !== initialSections) {
    setPrevInitialSections(initialSections);
    setSections(initialSections);
  }

  const latestSectionsRef = useRef(sections);
  useEffect(() => {
    latestSectionsRef.current = sections;
  }, [sections]);

  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    transition: "publish" | "return" | "close" | "archive";
    title: string;
    description: string;
  }>({
    open: false,
    transition: "publish",
    title: "",
    description: "",
  });

  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneTitle, setCloneTitle] = useState(`${exam.title} - Bản sao`);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isDraft = exam.status === "draft";
  const isPublished = exam.status === "published";
  const isClosed = exam.status === "closed";
  const isArchived = exam.status === "archived";
  const readOnly = !isDraft;
  const isTemplateFixed = exam.exam_template === "thpt_math_2026";
  const isPreScaffoldedTemplate =
    exam.exam_template === "thpt_math_2026" || exam.exam_template === "hsa_math_2026";

  // Flatten questions from sections for seamless direct Question-first workflow
  const activeSections = sections.filter((s) => !("deleted_at" in s && s.deleted_at));
  const defaultSection = activeSections[0];

  const allQuestions: QuestionData[] = activeSections
    .flatMap((s) => s.questions)
    .filter((q) => !q.deleted_at)
    .sort((a, b) => a.position - b.position);

  // Scoring strategy & Template Validation
  const strategy = getScoringStrategy(exam.scoring_strategy || exam.exam_template);
  const structureCheck = strategy.validateStructure(
    allQuestions.map((q) => ({
      id: q.id,
      question_type: q.question_type || "multiple_choice",
      score: q.score,
      options: q.question_options.map((o) => ({ id: o.id, is_correct: o.is_correct })),
    }))
  );

  // Validation Summary for Publishing
  const validationIssues: string[] = [];

  if (allQuestions.length === 0) {
    validationIssues.push("Đề thi cần có ít nhất một câu hỏi.");
  }

  allQuestions.forEach((q, qIdx) => {
    const qNum = qIdx + 1;
    const hasText = Boolean(q.content && q.content.trim() && q.content !== "Nhập câu hỏi");
    const hasImage = Boolean(q.image_path && q.image_path.trim());

    if (!hasText && !hasImage) {
      validationIssues.push(`Câu ${qNum}: Chưa nhập nội dung câu hỏi.`);
    }

    const qType = q.question_type || "multiple_choice";
    const activeOptions = q.question_options.filter((o) => !o.deleted_at);

    if (qType === "multiple_choice" || qType === "regular") {
      const correctOptions = activeOptions.filter((o) => o.is_correct);
      if (activeOptions.length < 2) {
        validationIssues.push(`Câu ${qNum}: Cần có ít nhất 2 phương án lựa chọn.`);
      }
      if (correctOptions.length !== 1) {
        validationIssues.push(`Câu ${qNum}: Cần chọn chính xác 1 đáp án đúng.`);
      }
    } else if (qType === "true_false_group") {
      if (activeOptions.length === 0) {
        validationIssues.push(`Câu ${qNum} (Đúng/Sai): Cần có các ý khẳng định.`);
      }
    } else if (qType === "short_answer") {
      if (!q.correct_answer_raw || q.correct_answer_raw.trim().length === 0) {
        validationIssues.push(`Câu ${qNum} (Trả lời ngắn): Chưa nhập đáp án chuẩn.`);
      }
    }
  });

  const isValidForPublish = validationIssues.length === 0;

  // Statistics
  const totalQuestions = allQuestions.length;
  const totalScore = allQuestions.reduce((sum, q) => sum + (q.score || 0), 0);

  const subjectName =
    exam.subjects?.name ??
    subjects.find((s) => s.id === exam.subject_id)?.name ??
    "Chưa chọn môn";

  // Question CRUD Handlers
  const handleAddQuestion = async (type: "multiple_choice" | "true_false_group" | "short_answer" = "multiple_choice") => {
    setShowAddMenu(false);
    startTransition(async () => {
      const sectionId = defaultSection?.id;
      const maxPos = allQuestions.reduce((max, q) => Math.max(max, q.position || 0), 0);
      const nextPos = maxPos + 1;

      const defaultScore = type === "true_false_group" ? "1.0" : type === "short_answer" ? "0.5" : "0.25";

      const qFormData = new FormData();
      qFormData.append("examId", exam.id);
      if (sectionId) qFormData.append("sectionId", sectionId);
      qFormData.append("content", "");
      qFormData.append("questionType", type);
      qFormData.append("score", defaultScore);
      qFormData.append("position", nextPos.toString());
      qFormData.append("isActive", "on");

      await saveQuestionAction({ ok: true, message: "" }, qFormData);
      router.refresh();
    });
  };

  const handleUpdateQuestion = async (
    questionId: string,
    payload: Partial<QuestionData>
  ) => {
    // 1. Synchronously update state and ref to avoid stale closures during rapid saves
    const updatedSections = latestSectionsRef.current.map((s) => ({
      ...s,
      questions: s.questions.map((q) =>
        q.id === questionId ? { ...q, ...payload } : q
      ),
    }));
    latestSectionsRef.current = updatedSections;
    setSections(updatedSections);

    const allQ = updatedSections
      .filter((s) => !("deleted_at" in s && s.deleted_at))
      .flatMap((s) => s.questions);
    const targetQ = allQ.find((q) => q.id === questionId);
    if (!targetQ) return;

    const mergedContent = payload.content !== undefined ? payload.content : targetQ.content;
    const mergedType = payload.question_type !== undefined ? payload.question_type : (targetQ.question_type || "multiple_choice");
    const mergedScore = payload.score !== undefined ? payload.score : targetQ.score;
    const mergedPosition = payload.position !== undefined ? payload.position : targetQ.position;
    const mergedRawAns = payload.correct_answer_raw !== undefined ? payload.correct_answer_raw : targetQ.correct_answer_raw;
    const mergedTol = payload.tolerance !== undefined ? payload.tolerance : targetQ.tolerance;
    const mergedExplanation = payload.explanation !== undefined ? payload.explanation : targetQ.explanation;
    const mergedImagePath = payload.image_path !== undefined ? payload.image_path : targetQ.image_path;
    const mergedIsActive = payload.is_active !== undefined ? payload.is_active : targetQ.is_active;

    const formData = new FormData();
    formData.append("examId", exam.id);
    formData.append("sectionId", targetQ.section_id);
    formData.append("questionId", questionId);
    formData.append("content", mergedContent ?? "");
    formData.append("questionType", mergedType);
    formData.append("score", (mergedScore ?? 0.25).toString());
    formData.append("position", (mergedPosition ?? 1).toString());

    if (mergedRawAns !== undefined && mergedRawAns !== null) {
      formData.append("correctAnswerRaw", mergedRawAns);
    }
    formData.append("tolerance", (mergedTol ?? 0).toString());

    if (mergedExplanation !== undefined && mergedExplanation !== null) {
      formData.append("explanation", mergedExplanation);
    }
    if (mergedImagePath !== undefined && mergedImagePath !== null) {
      formData.append("imagePath", mergedImagePath);
    }
    formData.append("isActive", mergedIsActive ? "on" : "off");

    const res = await saveQuestionAction({ ok: true, message: "" }, formData);
    if (!res.ok) {
      toast.error(res.message || "Không thể lưu câu hỏi.");
      throw new Error(res.message || "Lỗi lưu câu hỏi");
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        questions: s.questions.filter((q) => q.id !== questionId),
      }))
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("table", "questions");
      formData.append("id", questionId);
      await softDeleteContentAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleMoveQuestion = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= allQuestions.length) return;
    const targetQ = allQuestions[fromIndex];
    if (!targetQ) return;

    const reordered = [...allQuestions];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(toIndex, 0, moved);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("kind", "questions");
      formData.append("parentId", targetQ.section_id);
      reordered.forEach((q) => formData.append("orderedIds", q.id));
      await reorderContentAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  // Option Handlers
  const handleAddOption = async (questionId: string) => {
    startTransition(async () => {
      const targetQ = allQuestions.find((q) => q.id === questionId);
      const activeOptions = targetQ ? targetQ.question_options.filter((o) => !o.deleted_at) : [];
      const maxPos = activeOptions.reduce((max, o) => Math.max(max, o.position || 0), 0);
      const nextPos = maxPos + 1;

      const isTf = targetQ?.question_type === "true_false_group";
      const letter = isTf
        ? ["a", "b", "c", "d", "e", "f"][activeOptions.length] || `${activeOptions.length + 1}`
        : String.fromCharCode(65 + (activeOptions.length % 26));

      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("questionId", questionId);
      formData.append("content", isTf ? `Ý ${letter}: Khẳng định mới...` : `Phương án ${letter}`);
      formData.append("position", nextPos.toString());
      formData.append("isCorrect", isTf ? "on" : activeOptions.length === 0 ? "on" : "off");
      formData.append("isActive", "on");

      await saveOptionAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleUpdateOptionContent = async (optionId: string, newContent: string) => {
    startTransition(async () => {
      let targetOpt: OptionData | undefined;
      let targetQuestionId = "";
      for (const q of allQuestions) {
        const found = q.question_options.find((o) => o.id === optionId);
        if (found) {
          targetOpt = found;
          targetQuestionId = q.id;
          break;
        }
      }
      if (!targetOpt) return;

      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("questionId", targetQuestionId);
      formData.append("optionId", optionId);
      formData.append("content", newContent);
      formData.append("position", targetOpt.position.toString());
      if (targetOpt.is_correct) formData.append("isCorrect", "on");
      if (targetOpt.is_active) formData.append("isActive", "on");

      await saveOptionAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleSetCorrectOption = async (optionId: string, isCorrect?: boolean) => {
    const targetQ = allQuestions.find((q) =>
      q.question_options.some((o) => o.id === optionId)
    );
    if (!targetQ) return;

    const isTf = targetQ.question_type === "true_false_group";

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("questionId", targetQ.id);
      formData.append("optionId", optionId);
      if (isTf && isCorrect !== undefined) {
        formData.append("targetCorrect", isCorrect ? "on" : "off");
      }
      await markCorrectOptionAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleDeleteOption = async (optionId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("table", "question_options");
      formData.append("id", optionId);
      await softDeleteContentAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  // Exam Meta Save
  const handleSaveExamMeta = async (payload: Partial<ExamMetaData>) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", exam.id);
      if (payload.title) formData.append("title", payload.title);
      if (payload.subject_id) formData.append("subjectId", payload.subject_id);
      if (payload.category_id) formData.append("categoryId", payload.category_id);
      if (payload.duration_minutes)
        formData.append("durationMinutes", payload.duration_minutes.toString());
      if (payload.access_type) formData.append("accessType", payload.access_type);
      if (payload.description) formData.append("description", payload.description);
      if (payload.allow_guest_attempt) formData.append("allowGuestAttempt", "on");
      if (payload.fullscreen_required) formData.append("fullscreenRequired", "on");
      if (payload.show_score_after_submit) formData.append("showScoreAfterSubmit", "on");
      if (payload.show_answers_after_submit) formData.append("showAnswersAfterSubmit", "on");
      if (payload.show_solutions_after_submit) formData.append("showSolutionsAfterSubmit", "on");

      await updateExamAction({ ok: true, message: "" }, formData);
      setExam((prev) => ({ ...prev, ...payload }));
      router.refresh();
    });
  };

  const handleExecuteTransition = async () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("transition", transitionDialog.transition);
      const res = await transitionExamAction({ ok: true, message: "" }, formData);
      if (res.ok) {
        toast.success(res.message);
        setTransitionDialog((prev) => ({ ...prev, open: false }));
        router.refresh();
      } else {
        toast.error(res.message || "Không thể chuyển trạng thái đề thi.");
      }
    });
  };

  const handleExecuteClone = async () => {
    if (!cloneTitle.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("sourceExamId", exam.id);
      formData.append("newTitle", cloneTitle.trim());
      formData.append("newSlug", "");
      const res = await cloneExamAction({ ok: true, message: "" }, formData);
      if (res.ok && res.clonedExamId) {
        toast.success("Đã nhân bản đề thi thành công.");
        setCloneOpen(false);
        router.push(`/admin/exams/${res.clonedExamId}`);
      } else {
        toast.error(res.message || "Không thể nhân bản đề thi.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Sticky Top Header */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] shadow-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="-ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl">
                <Link href="/admin/exams" className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Danh sách đề</span>
                </Link>
              </Button>
              <StatusBadge status={exam.status} />
              <span className="text-xs text-[var(--muted-foreground)] font-mono">
                {isPending ? "Đang đồng bộ..." : "Đã lưu vào hệ thống"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight">
                {exam.title}
              </h1>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {subjectName}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)] pt-0.5">
              <div className="flex items-center gap-1 font-medium">
                <HelpCircle className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                <span>{totalQuestions} câu hỏi</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-[var(--foreground)]">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>Tổng: {totalScore.toFixed(2).replace(/\.00$/, "")} điểm</span>
              </div>
              <div className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                <span>{exam.duration_minutes} phút</span>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <MetaSettingsModal
              exam={exam}
              subjects={subjects}
              categories={categories}
              readOnly={readOnly}
              onSave={handleSaveExamMeta}
            />

            <ExamPreviewModal exam={exam} sections={sections} />

            {/* 1. DRAFT STATE ACTIONS */}
            {isDraft && (
              <Button
                type="button"
                onClick={() =>
                  setTransitionDialog({
                    open: true,
                    transition: "publish",
                    title: "Xuất bản đề thi này?",
                    description:
                      "Sau khi xuất bản, cấu trúc câu hỏi và đáp án sẽ được khóa an toàn để học sinh bắt đầu làm bài.",
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-xs"
              >
                <Send className="mr-1.5 h-4 w-4" />
                <span>Xuất bản đề thi</span>
              </Button>
            )}

            {/* 2. PUBLISHED STATE ACTIONS */}
            {isPublished && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTransitionDialog({
                      open: true,
                      transition: "close",
                      title: "Đóng đề thi?",
                      description:
                        "Đóng đề sẽ ngăn các lượt thi mới. Sau khi đóng đề, bạn có thể bấm 'Mở sửa đề' để chỉnh sửa nội dung hoặc xuất bản lại.",
                    })
                  }
                  className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-medium rounded-xl shadow-xs"
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  <span>Đóng đề</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTransitionDialog({
                      open: true,
                      transition: "archive",
                      title: "Lưu trữ đề thi?",
                      description:
                        "Đề thi sẽ được lưu trữ và ẩn khỏi danh sách khả dụng. Mọi dữ liệu và kết quả thi trước đây vẫn được bảo toàn.",
                    })
                  }
                  className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] font-medium rounded-xl shadow-xs"
                >
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  <span>Lưu trữ</span>
                </Button>
              </>
            )}

            {/* 3. CLOSED STATE ACTIONS */}
            {isClosed && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTransitionDialog({
                      open: true,
                      transition: "return",
                      title: "Mở đề để chỉnh sửa?",
                      description:
                        "Đề thi sẽ chuyển về trạng thái Bản nháp để bạn có thể chỉnh sửa câu hỏi, đáp án, điểm số và sau đó xuất bản lại.",
                    })
                  }
                  className="border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-medium rounded-xl shadow-xs"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  <span>Mở sửa đề</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setTransitionDialog({
                      open: true,
                      transition: "publish",
                      title: "Xuất bản lại đề thi này?",
                      description:
                        "Đề thi sẽ mở lại để học sinh có thể tiếp tục vào làm bài.",
                    })
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-xs"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  <span>Xuất bản lại đề</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTransitionDialog({
                      open: true,
                      transition: "archive",
                      title: "Lưu trữ đề thi?",
                      description:
                        "Đề thi sẽ được lưu trữ và ẩn khỏi danh sách khả dụng. Mọi dữ liệu và kết quả thi trước đây vẫn được bảo toàn.",
                    })
                  }
                  className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] font-medium rounded-xl shadow-xs"
                >
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  <span>Lưu trữ</span>
                </Button>
              </>
            )}

            {/* 4. ARCHIVED STATE ACTIONS */}
            {isArchived && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setTransitionDialog({
                    open: true,
                    transition: "return",
                    title: "Khôi phục đề thi về Bản nháp?",
                    description:
                      "Đề thi sẽ được đưa về trạng thái Bản nháp để bạn tiếp tục chỉnh sửa hoặc xuất bản lại.",
                  })
                }
                className="border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-medium rounded-xl shadow-xs"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                <span>Khôi phục (Bản nháp)</span>
              </Button>
            )}

            {/* CLONE BUTTON (AVAILABLE IN ALL STATES) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCloneTitle(`${exam.title} - Bản sao`);
                setCloneOpen(true);
              }}
              className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 font-medium rounded-xl shadow-xs"
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              <span>Nhân bản đề</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Lock Notice if not draft */}
      {!isDraft && (
        <div
          className={cn(
            "rounded-2xl border p-4 text-sm flex items-center justify-between gap-3 shadow-md",
            isPublished && "border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200",
            isClosed && "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
            isArchived && "border-slate-500/30 bg-slate-500/10 text-[var(--foreground)]"
          )}
        >
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-[var(--primary)] shrink-0" />
            <div>
              <p className="font-bold text-[var(--foreground)]">
                Đề thi đang ở trạng thái {examStatusLabels[exam.status as keyof typeof examStatusLabels]}.
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {isPublished && (
                  <>
                    Nội dung câu hỏi và đáp án được khóa an toàn để học sinh làm bài. Nếu muốn sửa đề, hãy bấm <strong>Đóng đề</strong> &rarr; <strong>Mở sửa đề</strong> &rarr; <strong>Xuất bản lại đề</strong>, hoặc bấm <strong>Nhân bản đề</strong> để tạo một bản sao nháp mới.
                  </>
                )}
                {isClosed && (
                  <>
                    Học sinh hiện không thể vào thi. Bấm <strong>Mở sửa đề</strong> để chuyển về Bản nháp chỉnh sửa nội dung, hoặc bấm <strong>Xuất bản lại đề</strong> khi sẵn sàng.
                  </>
                )}
                {isArchived && (
                  <>
                    Đề thi đã được lưu trữ và ẩn khỏi danh sách khả dụng. Bấm <strong>Khôi phục (Bản nháp)</strong> nếu muốn mở lại đề thi này.
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setCloneTitle(`${exam.title} - Bản sao`);
              setCloneOpen(true);
            }}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shrink-0 rounded-xl shadow-md shadow-blue-600/20 font-medium"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Nhân bản để sửa
          </Button>
        </div>
      )}

      {/* Template Structure Warning Banner */}
      {isDraft && !structureCheck.isValid && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm shadow-md">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[var(--foreground)]">
                Gợi ý cấu trúc theo chuẩn {strategy.name}
              </p>
              <ul className="list-disc pl-4 text-xs text-[var(--muted-foreground)] space-y-0.5">
                {structureCheck.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Draft Validation Error Box */}
      {isDraft && !isValidForPublish && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 shadow-md">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[var(--foreground)]">
                Lưu ý trước khi xuất bản ({validationIssues.length} điểm cần hoàn thiện)
              </p>
              <ul className="list-disc pl-4 text-xs text-[var(--muted-foreground)] space-y-0.5">
                {validationIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Questions Flat List */}
      <div className="space-y-6">
        {allQuestions.map((question, qIndex) => (
          <BuilderQuestionCard
            key={question.id}
            question={question}
            questionIndex={qIndex}
            totalQuestions={allQuestions.length}
            readOnly={readOnly}
            isTemplateFixed={isTemplateFixed}
            examTemplate={exam.exam_template}
            onUpdateQuestion={(payload) => handleUpdateQuestion(question.id, payload)}
            onDeleteQuestion={handleDeleteQuestion}
            onAddOption={handleAddOption}
            onUpdateOptionContent={handleUpdateOptionContent}
            onSetCorrectOption={handleSetCorrectOption}
            onDeleteOption={handleDeleteOption}
            onMoveQuestion={(dir) => {
              const target = dir === "up" ? qIndex - 1 : qIndex + 1;
              if (target >= 0 && target < allQuestions.length) {
                handleMoveQuestion(qIndex, target);
              }
            }}
          />
        ))}

        {/* Quick Add Question Button - Shown only for Custom Exams */}
        {!readOnly && !isPreScaffoldedTemplate && (
          <div className="pt-2 relative">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAddQuestion("multiple_choice")}
                className="group flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] transition-all shadow-md cursor-pointer"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-hover)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                  <Plus className="h-4 w-4" />
                </div>
                <span>Thêm câu hỏi trắc nghiệm (+)</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="flex items-center gap-1.5 h-full px-4 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all shadow-md cursor-pointer"
                >
                  <span>Dạng khác</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showAddMenu && (
                  <div
                    className="absolute right-0 bottom-full mb-2 z-30 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl space-y-1"
                    onMouseLeave={() => setShowAddMenu(false)}
                  >
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("multiple_choice")}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface-hover)] transition-colors block text-[var(--foreground)]"
                    >
                      🔹 Trắc nghiệm 4 lựa chọn (0.25đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("true_false_group")}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface-hover)] transition-colors block text-[var(--foreground)]"
                    >
                      🔸 Chùm câu hỏi Đúng / Sai 4 ý (1.0đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion("short_answer")}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface-hover)] transition-colors block text-[var(--foreground)]"
                    >
                      ▫️ Trả lời ngắn / Điền đáp án (0.5đ)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transition Confirmation Dialog */}
      <Dialog
        open={transitionDialog.open}
        onOpenChange={(open) =>
          setTransitionDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--foreground)]">
              {transitionDialog.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--muted-foreground)] mt-1">
              {transitionDialog.description}
            </DialogDescription>
          </DialogHeader>

          {transitionDialog.transition === "publish" && !isValidForPublish && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 my-2">
              <p className="font-semibold mb-1">
                Không thể xuất bản do các điều kiện sau:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {validationIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setTransitionDialog((prev) => ({ ...prev, open: false }))
              }
              className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={
                isPending ||
                (transitionDialog.transition === "publish" && !isValidForPublish)
              }
              onClick={handleExecuteTransition}
              className={
                transitionDialog.transition === "publish"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 font-bold"
                  : "rounded-xl"
              }
            >
              {isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Exam Dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--foreground)]">
              Nhân bản đề thi
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)] mt-1">
              Hệ thống sẽ tạo một bản sao ở trạng thái &quot;Bản nháp&quot; với tất cả câu hỏi và đáp án độc lập.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Tiêu đề đề thi mới
              <Input
                value={cloneTitle}
                onChange={(e) => setCloneTitle(e.target.value)}
                placeholder="Nhập tiêu đề..."
                className="mt-1"
                required
              />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCloneOpen(false)} className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isPending || !cloneTitle.trim()}
              onClick={handleExecuteClone}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20"
            >
              {isPending ? "Đang nhân bản..." : "Tạo bản sao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
