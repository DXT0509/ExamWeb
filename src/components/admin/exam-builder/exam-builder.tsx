"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Layers,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  saveSectionAction,
  softDeleteContentAction,
  transitionExamAction,
  updateExamAction,
} from "@/lib/exams/actions";
import { examStatusLabels } from "@/lib/exams/constants";
import { BuilderSectionItem, type SectionData } from "./builder-section-item";
import { ExamPreviewModal } from "./exam-preview-modal";
import { MetaSettingsModal, type ExamMetaData } from "./meta-settings-modal";
import type { QuestionData } from "./builder-question-card";
import type { OptionData } from "./builder-option-item";

type SelectItem = { id: string; name: string };

interface ExamBuilderProps {
  exam: ExamMetaData & {
    subjects?: { id: string; name: string } | null;
    exam_categories?: { id: string; name: string } | null;
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

  // Transition & Clone Dialog states
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

  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

  const isDraft = exam.status === "draft";
  const isPublished = exam.status === "published";
  const isClosed = exam.status === "closed";
  const readOnly = !isDraft;

  // Validation Summary for Publishing
  const validationIssues: string[] = [];
  const activeSections = sections.filter((s) => !("deleted_at" in s && s.deleted_at));

  if (activeSections.length === 0) {
    validationIssues.push("Đề thi cần có ít nhất một phần thi.");
  }

  activeSections.forEach((section, sIdx) => {
    const activeQuestions = section.questions.filter((q) => !q.deleted_at);
    if (activeQuestions.length === 0) {
      validationIssues.push(`Phần ${sIdx + 1} ("${section.title}") chưa có câu hỏi nào.`);
    }

    activeQuestions.forEach((q, qIdx) => {
      if (!q.content || !q.content.trim() || q.content === "Nhập câu hỏi") {
        validationIssues.push(
          `Phần ${sIdx + 1}, Câu ${qIdx + 1}: Chưa nhập nội dung câu hỏi.`
        );
      }
      const activeOptions = q.question_options.filter((o) => !o.deleted_at);
      const correctOptions = activeOptions.filter((o) => o.is_correct);

      if (activeOptions.length < 2) {
        validationIssues.push(
          `Phần ${sIdx + 1}, Câu ${qIdx + 1}: Cần có ít nhất 2 phương án lựa chọn.`
        );
      }
      if (correctOptions.length !== 1) {
        validationIssues.push(
          `Phần ${sIdx + 1}, Câu ${qIdx + 1}: Cần chọn chính xác một đáp án đúng.`
        );
      }
    });
  });

  const isValidForPublish = validationIssues.length === 0;

  // Total calculated statistics
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

  const subjectName =
    exam.subjects?.name ??
    subjects.find((s) => s.id === exam.subject_id)?.name ??
    "Chưa chọn môn";

  // Handlers for Sections
  const handleAddSection = async () => {
    startTransition(async () => {
      const activeSections = sections.filter((s) => !s.deleted_at);
      const maxPos = activeSections.reduce((max, s) => Math.max(max, s.position || 0), 0);
      const nextPos = maxPos + 1;

      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("title", `Phần ${activeSections.length + 1}`);
      formData.append("position", nextPos.toString());
      await saveSectionAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleUpdateSection = async (
    sectionId: string,
    title: string,
    description: string | null
  ) => {
    startTransition(async () => {
      const sec = sections.find((s) => s.id === sectionId);
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("sectionId", sectionId);
      formData.append("title", title);
      if (description) formData.append("description", description);
      formData.append("position", (sec?.position ?? 1).toString());
      await saveSectionAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("table", "exam_sections");
      formData.append("id", sectionId);
      await softDeleteContentAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleMoveSection = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(toIndex, 0, moved);
    setSections(reordered);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("kind", "sections");
      formData.append("parentId", exam.id);
      reordered.forEach((s) => formData.append("orderedIds", s.id));
      await reorderContentAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleAddQuestion = async (sectionId: string) => {
    startTransition(async () => {
      const sec = sections.find((s) => s.id === sectionId);
      const activeQuestions = sec ? sec.questions.filter((q) => !q.deleted_at) : [];
      const maxPos = activeQuestions.reduce((max, q) => Math.max(max, q.position || 0), 0);
      const nextPos = maxPos + 1;

      const qFormData = new FormData();
      qFormData.append("examId", exam.id);
      qFormData.append("sectionId", sectionId);
      qFormData.append("content", "");
      qFormData.append("score", "1");
      qFormData.append("position", nextPos.toString());
      qFormData.append("isActive", "on");

      await saveQuestionAction({ ok: true, message: "" }, qFormData);
      router.refresh();
    });
  };

  const handleUpdateQuestion = async (
    questionId: string,
    payload: { content?: string; score?: number; explanation?: string | null; image_path?: string | null }
  ) => {
    startTransition(async () => {
      let targetQ: QuestionData | undefined;
      let targetSectionId = "";
      for (const s of sections) {
        const found = s.questions.find((q) => q.id === questionId);
        if (found) {
          targetQ = found;
          targetSectionId = s.id;
          break;
        }
      }
      if (!targetQ) return;

      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("sectionId", targetSectionId);
      formData.append("questionId", questionId);
      formData.append("content", payload.content ?? targetQ.content);
      formData.append("score", (payload.score ?? targetQ.score).toString());
      formData.append("position", targetQ.position.toString());
      if (payload.explanation) formData.append("explanation", payload.explanation);
      if (payload.image_path) formData.append("imagePath", payload.image_path);
      formData.append("isActive", targetQ.is_active ? "on" : "off");

      await saveQuestionAction({ ok: true, message: "" }, formData);
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

  const handleMoveQuestion = async (
    sectionId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    const secIndex = sections.findIndex((s) => s.id === sectionId);
    if (secIndex === -1) return;
    const sec = sections[secIndex];
    if (!sec) return;
    const activeQuestions = [...sec.questions.filter((q) => !q.deleted_at)];
    if (toIndex < 0 || toIndex >= activeQuestions.length) return;

    const [moved] = activeQuestions.splice(fromIndex, 1);
    if (!moved) return;
    activeQuestions.splice(toIndex, 0, moved);

    const updatedSections = [...sections];
    updatedSections[secIndex] = { ...sec, questions: activeQuestions };
    setSections(updatedSections);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("kind", "questions");
      formData.append("parentId", sectionId);
      activeQuestions.forEach((q) => formData.append("orderedIds", q.id));
      await reorderContentAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  // Handlers for Options
  const handleAddOption = async (questionId: string) => {
    startTransition(async () => {
      let targetQ: QuestionData | undefined;
      for (const s of sections) {
        const found = s.questions.find((q) => q.id === questionId);
        if (found) {
          targetQ = found;
          break;
        }
      }
      const activeOptions = targetQ
        ? targetQ.question_options.filter((o) => !o.deleted_at)
        : [];
      const maxPos = activeOptions.reduce((max, o) => Math.max(max, o.position || 0), 0);
      const nextPos = maxPos + 1;

      const letter = String.fromCharCode(65 + (activeOptions.length % 26));
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("questionId", questionId);
      formData.append("content", `Phương án ${letter}`);
      formData.append("position", nextPos.toString());
      formData.append("isCorrect", activeOptions.length === 0 ? "on" : "off");
      formData.append("isActive", "on");

      await saveOptionAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleUpdateOptionContent = async (optionId: string, newContent: string) => {
    startTransition(async () => {
      let targetOpt: OptionData | undefined;
      let targetQuestionId = "";
      for (const s of sections) {
        for (const q of s.questions) {
          const found = q.question_options.find((o) => o.id === optionId);
          if (found) {
            targetOpt = found;
            targetQuestionId = q.id;
            break;
          }
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

  const handleSetCorrectOption = async (questionId: string, optionId: string) => {
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        questions: sec.questions.map((q) => {
          if (q.id !== questionId) return q;
          return {
            ...q,
            question_options: q.question_options.map((opt) => ({
              ...opt,
              is_correct: opt.id === optionId,
            })),
          };
        }),
      }))
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("questionId", questionId);
      formData.append("optionId", optionId);
      await markCorrectOptionAction({ ok: true, message: "" }, formData);
      router.refresh();
    });
  };

  const handleDeleteOption = async (optionId: string) => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        questions: s.questions.map((q) => ({
          ...q,
          question_options: q.question_options.filter((opt) => opt.id !== optionId),
        })),
      }))
    );

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

  // Transition & Clone Action Trigger
  const handleExecuteTransition = async () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("examId", exam.id);
      formData.append("transition", transitionDialog.transition);
      await transitionExamAction({ ok: true, message: "" }, formData);
      setTransitionDialog((prev) => ({ ...prev, open: false }));
      router.refresh();
    });
  };

  const handleExecuteClone = async () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("sourceExamId", exam.id);
      formData.append("newTitle", cloneTitle);
      formData.append("newSlug", ""); // Will be auto generated or accepted by cloneExamAction
      await cloneExamAction({ ok: true, message: "" }, formData);
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Sticky Exam Builder Top Header */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] shadow-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="-ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
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

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)] pt-0.5">
              <div className="flex items-center gap-1 font-medium">
                <Layers className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                <span>{activeSections.length} phần thi</span>
              </div>
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

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Meta Settings Modal */}
            <MetaSettingsModal
              exam={exam}
              subjects={subjects}
              categories={categories}
              readOnly={readOnly}
              onSave={handleSaveExamMeta}
            />

            {/* Preview Modal */}
            <ExamPreviewModal exam={exam} sections={sections} />

            {/* Lifecycle Action Buttons */}
            {isDraft && (
              <Button
                type="button"
                onClick={() =>
                  setTransitionDialog({
                    open: true,
                    transition: "publish",
                    title: "Xuất bản đề thi này?",
                    description:
                      "Sau khi xuất bản, cấu trúc phần thi, câu hỏi và đáp án sẽ được khóa an toàn để học sinh bắt đầu làm bài.",
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <Send className="mr-1.5 h-4 w-4" />
                <span>Xuất bản đề thi</span>
              </Button>
            )}

            {isPublished && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTransitionDialog({
                      open: true,
                      transition: "return",
                      title: "Đưa đề thi về Bản nháp?",
                      description:
                        "Nếu đề thi chưa có lượt thi nào, bạn có thể đưa về bản nháp để tiếp tục chỉnh sửa câu hỏi.",
                    })
                  }
                  className="text-slate-700"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  <span>Đưa về bản nháp</span>
                </Button>

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
                        "Đóng đề sẽ ngăn các lượt thi mới. Các học sinh đang làm bài vẫn tiếp tục đến hết giờ.",
                    })
                  }
                  className="text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  <span>Đóng đề</span>
                </Button>
              </>
            )}

            {(isPublished || isClosed) && (
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
                className="text-slate-700"
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                <span>Lưu trữ</span>
              </Button>
            )}

            {/* Clone Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCloneTitle(`${exam.title} - Bản sao`);
                setCloneOpen(true);
              }}
              className="text-slate-700"
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              <span>Nhân bản đề</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Published Notice Banner */}
      {!isDraft && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="font-bold text-[var(--foreground)]">
                Đề thi đang ở trạng thái {examStatusLabels[exam.status as keyof typeof examStatusLabels]}.
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Nội dung phần thi, câu hỏi và đáp án được khóa an toàn. Bạn có thể bấm &quot;Nhân bản đề&quot; để tạo một phiên bản nháp mới nếu muốn chỉnh sửa.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setCloneTitle(`${exam.title} - Bản sao`);
              setCloneOpen(true);
            }}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shrink-0 rounded-xl shadow-md shadow-blue-600/20"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Nhân bản để sửa
          </Button>
        </div>
      )}

      {/* Validation Alert Box (when draft has issues) */}
      {isDraft && !isValidForPublish && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 shadow-md">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[var(--foreground)]">
                Lưu ý trước khi xuất bản đề ({validationIssues.length} vấn đề cần hoàn thiện)
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

      {/* Sections Container */}
      <div className="space-y-8">
        {activeSections.map((section, sIndex) => (
          <BuilderSectionItem
            key={section.id}
            section={section}
            sectionIndex={sIndex}
            totalSections={activeSections.length}
            readOnly={readOnly}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onAddOption={handleAddOption}
            onUpdateOptionContent={handleUpdateOptionContent}
            onSetCorrectOption={handleSetCorrectOption}
            onDeleteOption={handleDeleteOption}
            onMoveSection={(dir) => {
              const target = dir === "up" ? sIndex - 1 : sIndex + 1;
              if (target >= 0 && target < activeSections.length) {
                handleMoveSection(sIndex, target);
              }
            }}
            onMoveQuestion={handleMoveQuestion}
            onDragStartSection={() => {
              setDraggedSectionIndex(sIndex);
            }}
            onDragOverSection={(e) => {
              e.preventDefault();
            }}
            onDropSection={(e) => {
              e.preventDefault();
              if (draggedSectionIndex !== null && draggedSectionIndex !== sIndex) {
                handleMoveSection(draggedSectionIndex, sIndex);
              }
              setDraggedSectionIndex(null);
            }}
          />
        ))}

        {/* Add New Section Button */}
        {!readOnly && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddSection}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-5 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] transition-all shadow-md cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-hover)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                <Plus className="h-4 w-4" />
              </div>
              <span>Thêm Phần thi mới (+)</span>
            </button>
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

          {/* If publishing and has issues */}
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
              Hệ thống sẽ tạo một bản sao ở trạng thái &quot;Bản nháp&quot; với tất cả phần thi, câu hỏi và đáp án độc lập.
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
