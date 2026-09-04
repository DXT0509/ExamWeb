"use client";

import { useState, useRef } from "react";
import {
  Image as ImageIcon,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Pencil,
  Upload,
  Trash2,
  Loader2,
  Check,
  X,
  Calculator,
  Info,
  Clipboard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { uploadQuestionImageAction } from "@/lib/exams/actions";
import { BuilderOptionItem, type OptionData } from "./builder-option-item";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { InsertPlaceholder } from "./insert-placeholder";

export interface QuestionData {
  id: string;
  section_id: string;
  content: string;
  image_path: string | null;
  explanation: string | null;
  score: number;
  position: number;
  is_active: boolean;
  deleted_at: string | null;
  question_type: string;
  correct_answer_raw?: string | null;
  tolerance?: number | null;
  metadata?: Record<string, unknown> | null;
  question_options: OptionData[];
}

interface BuilderQuestionCardProps {
  question: QuestionData;
  questionIndex: number;
  totalQuestions: number;
  readOnly: boolean;
  isTemplateFixed?: boolean;
  onUpdateQuestion: (payload: Partial<QuestionData>) => Promise<void> | void;
  onDeleteQuestion: (id: string) => Promise<void> | void;
  onAddOption: (questionId: string) => Promise<void> | void;
  onUpdateOptionContent: (optionId: string, newContent: string) => Promise<void> | void;
  onSetCorrectOption: (optionId: string, isCorrect?: boolean) => Promise<void> | void;
  onDeleteOption: (optionId: string) => Promise<void> | void;
  onMoveQuestion?: (direction: "up" | "down") => void;
}

export function BuilderQuestionCard({
  question,
  questionIndex,
  totalQuestions,
  readOnly,
  isTemplateFixed = false,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddOption,
  onUpdateOptionContent,
  onSetCorrectOption,
  onDeleteOption,
  onMoveQuestion,
}: BuilderQuestionCardProps) {
  const [prevQuestion, setPrevQuestion] = useState(question);
  const [content, setContent] = useState(question.content);
  const [score, setScore] = useState(question.score.toString());
  const [questionType, setQuestionType] = useState(question.question_type || "multiple_choice");
  const [correctAnswerRaw, setCorrectAnswerRaw] = useState(question.correct_answer_raw ?? "");
  const [tolerance, setTolerance] = useState((question.tolerance ?? 0).toString());
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [imagePath, setImagePath] = useState(question.image_path ?? "");

  if (prevQuestion !== question) {
    setPrevQuestion(question);
    setContent(question.content);
    setScore(question.score.toString());
    setQuestionType(question.question_type || "multiple_choice");
    setCorrectAnswerRaw(question.correct_answer_raw ?? "");
    setTolerance((question.tolerance ?? 0).toString());
    setExplanation(question.explanation ?? "");
    setImagePath(question.image_path ?? "");
  }

  // Separate editing states: "none" | "content" | "answer"
  const [editingMode, setEditingMode] = useState<"none" | "content" | "answer">("none");
  const [showExplanation, setShowExplanation] = useState(Boolean(question.explanation));
  const [showImageField, setShowImageField] = useState(Boolean(question.image_path));
  const [showMenu, setShowMenu] = useState(false);

  // Image source type: File upload vs URL
  const [imageSourceType, setImageSourceType] = useState<"file" | "url">(
    question.image_path?.startsWith("http") ? "url" : "file"
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOptions = question.question_options
    .filter((o) => !o.deleted_at)
    .sort((a, b) => a.position - b.position);

  const isTfGroup = question.question_type === "true_false_group";
  const isShortAnswer = question.question_type === "short_answer";
  const isMcq = !isTfGroup && !isShortAnswer;

  const hasCorrectOption = isMcq ? activeOptions.some((o) => o.is_correct) : true;
  const hasEnoughOptions = isMcq ? activeOptions.length >= 2 : isTfGroup ? activeOptions.length >= 1 : true;
  const hasShortAnswer = isShortAnswer ? Boolean(correctAnswerRaw && correctAnswerRaw.trim().length > 0) : true;

  const uploadAndApplyImage = async (file: File) => {
    setFileError(null);

    if (file.size > 5 * 1024 * 1024) {
      const msg = "Dung lượng ảnh vượt quá giới hạn 5MB.";
      setFileError(msg);
      toast.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      const msg = "Vui lòng chọn hoặc dán tệp hình ảnh hợp lệ (PNG, JPG, WebP, GIF, SVG).";
      setFileError(msg);
      toast.error(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setShowImageField(true);
    setImageSourceType("file");
    setIsUploadingImage(true);

    const toastId = `upload-question-img-${question.id}`;
    toast.loading("Đang tải ảnh lên máy chủ...", { id: toastId });

    try {
      const ext = file.type.split("/")[1] || "png";
      const safeExt = ext === "jpeg" ? "jpg" : ext;
      const uploadFile =
        file.name && file.name !== "image.png" && file.name !== "blob"
          ? file
          : new File([file], `screenshot-${Date.now()}.${safeExt}`, { type: file.type });

      const uploadData = new FormData();
      uploadData.append("file", uploadFile);
      const res = await uploadQuestionImageAction(uploadData);
      if (res.ok && res.url) {
        setImagePath(res.url);
        toast.success("Đã dán và tải ảnh lên thành công!", { id: toastId });
      } else {
        const errorMsg = res.message || "Không thể tải ảnh lên.";
        setFileError(errorMsg);
        toast.error(errorMsg, { id: toastId });
      }
    } catch {
      const errorMsg = "Lỗi kết nối khi tải ảnh lên.";
      setFileError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndApplyImage(file);
  };

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    if (readOnly) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFile: File | null = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === "file" && item.type.startsWith("image/")) {
        imageFile = item.getAsFile();
        break;
      }
    }

    if (!imageFile) return;

    e.preventDefault();
    e.stopPropagation();

    if (editingMode !== "content") {
      setEditingMode("content");
    }

    await uploadAndApplyImage(imageFile);
  };

  const handleDropImage = async (e: React.DragEvent) => {
    if (readOnly) return;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file && file.type.startsWith("image/")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (editingMode !== "content") {
        setEditingMode("content");
      }
      await uploadAndApplyImage(file);
    }
  };

  const handleClearImage = () => {
    setImagePath("");
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // State 1: Save Content Only
  const handleSaveContent = async () => {
    const numScore = parseFloat(score);
    const trimmedContent = content.trim();

    await onUpdateQuestion({
      content: trimmedContent,
      score: isTemplateFixed ? question.score : isNaN(numScore) || numScore <= 0 ? 1 : numScore,
      question_type: isTemplateFixed ? question.question_type : questionType,
      explanation: explanation.trim() ? explanation.trim() : null,
      image_path: imagePath.trim() ? imagePath.trim() : null,
    });
    setEditingMode("none");
  };

  // State 2: Save Answer Only (Short Answer)
  const handleSaveAnswer = async () => {
    await onUpdateQuestion({
      correct_answer_raw: correctAnswerRaw.trim() || null,
      tolerance: parseFloat(tolerance) || 0,
    });
    setEditingMode("none");
  };

  const handleCancel = () => {
    setContent(question.content);
    setScore(question.score.toString());
    setQuestionType(question.question_type || "multiple_choice");
    setCorrectAnswerRaw(question.correct_answer_raw ?? "");
    setTolerance((question.tolerance ?? 0).toString());
    setExplanation(question.explanation ?? "");
    setImagePath(question.image_path ?? "");
    setEditingMode("none");
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "true_false_group":
        return { label: "Đúng / Sai", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      case "short_answer":
        return { label: "Trả lời ngắn", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      default:
        return { label: "Trắc nghiệm", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
    }
  };

  const typeInfo = getTypeLabel(question.question_type);

  return (
    <div
      onPaste={handlePasteImage}
      className={cn(
        "group/card relative rounded-2xl border bg-[var(--card)] shadow-xs transition-all duration-200",
        editingMode !== "none"
          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/10 shadow-md"
          : "border-[var(--border)] hover:border-[var(--border-subtle)] hover:shadow-sm"
      )}
    >
      {/* Question Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--divider)] bg-[var(--card-secondary)] px-4 py-3 sm:px-5 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          {/* Question Number Badge & Type/Score Badges */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Câu {questionIndex + 1}
            </span>
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold border", typeInfo.color)}>
              {typeInfo.label}
            </span>
            <span className="rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)] border border-[var(--border)]">
              {question.score} điểm
            </span>
          </div>

          {/* Validation Indicators */}
          {!readOnly && (
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              {isMcq && !hasCorrectOption && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <AlertCircle className="h-3 w-3" />
                  Chưa chọn đáp án đúng
                </span>
              )}
              {isMcq && !hasEnoughOptions && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
                  <AlertCircle className="h-3 w-3" />
                  Cần ít nhất 2 phương án
                </span>
              )}
              {isShortAnswer && !hasShortAnswer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <AlertCircle className="h-3 w-3" />
                  Chưa nhập đáp án mẫu
                </span>
              )}
              {((isMcq && hasCorrectOption && hasEnoughOptions) || (isTfGroup && hasEnoughOptions) || (isShortAnswer && hasShortAnswer)) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Hợp lệ
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Direct Move Up / Down Buttons */}
          {!readOnly && (
            <div className="flex items-center border border-[var(--border)] rounded-xl bg-[var(--surface)] p-0.5 shadow-2xs">
              <button
                type="button"
                disabled={questionIndex === 0}
                onClick={() => onMoveQuestion?.("up")}
                aria-label="Di chuyển câu hỏi lên trên"
                title="Di chuyển câu hỏi lên trên"
                className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--muted-foreground)] transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={questionIndex === totalQuestions - 1}
                onClick={() => onMoveQuestion?.("down")}
                aria-label="Di chuyển câu hỏi xuống dưới"
                title="Di chuyển câu hỏi xuống dưới"
                className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--muted-foreground)] transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {!readOnly && (
            <>
              {/* Quick Edit Question Content Button in Header */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingMode(editingMode === "content" ? "none" : "content")}
                className="h-8 text-xs border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl hidden sm:flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Sửa câu hỏi</span>
              </Button>

              {/* Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="Tùy chọn câu hỏi"
                  className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl text-[var(--foreground)]"
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <button
                      type="button"
                      disabled={questionIndex === 0}
                      onClick={() => {
                        onMoveQuestion?.("up");
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-colors"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      <span>Di chuyển lên trên</span>
                    </button>
                    <button
                      type="button"
                      disabled={questionIndex === totalQuestions - 1}
                      onClick={() => {
                        onMoveQuestion?.("down");
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-40 transition-colors"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      <span>Di chuyển xuống dưới</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMode("content");
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Chỉnh sửa nội dung câu</span>
                    </button>
                    {isShortAnswer && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMode("answer");
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        <span>Chỉnh sửa đáp án chuẩn</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Delete Question Button */}
              <DeleteConfirmDialog
                title={`Xóa câu hỏi ${questionIndex + 1}?`}
                description="Câu hỏi và các phương án liên quan sẽ bị xóa khỏi đề thi."
                ariaLabel={`Xóa câu hỏi ${questionIndex + 1}`}
                onConfirm={() => onDeleteQuestion(question.id)}
              />
            </>
          )}
        </div>
      </div>

      {/* Question Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* ========================================================================= */}
        {/* STATE 1: EDITING QUESTION CONTENT ONLY                                    */}
        {/* ========================================================================= */}
        {editingMode === "content" && !readOnly ? (
          <div
            onPaste={handlePasteImage}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setIsDragging(true);
              }
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDragging(false);
            }}
            onDrop={handleDropImage}
            className={cn(
              "space-y-4 rounded-2xl border bg-[var(--surface)]/50 p-4 sm:p-5 transition-all duration-200 relative",
              isDragging
                ? "border-dashed border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-[var(--primary)]/5"
                : "border-[var(--primary)]/30"
            )}
          >
            <div className="flex items-center justify-between border-b border-[var(--divider)] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Chỉnh sửa nội dung câu hỏi {questionIndex + 1}
              </span>
            </div>

            {/* Custom Exam Only: Allow changing Question Type and Score */}
            {!isTemplateFixed && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-[var(--foreground)] sm:col-span-2">
                  Dạng câu hỏi
                  <select
                    value={questionType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setQuestionType(newType);
                      if (newType === "true_false_group") setScore("1.0");
                      else if (newType === "short_answer") setScore("0.5");
                      else setScore("0.25");
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] font-medium transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  >
                    <option value="multiple_choice">Trắc nghiệm 4 lựa chọn (Chọn 1 đáp án đúng)</option>
                    <option value="true_false_group">Chùm câu hỏi Đúng / Sai (4 ý a, b, c, d)</option>
                    <option value="short_answer">Trả lời ngắn (Điền số / Phân số)</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold text-[var(--foreground)]">
                  Điểm số câu
                  <Input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="mt-1"
                  />
                </label>
              </div>
            )}

            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Nội dung câu hỏi
              <textarea
                value={content === "Nhập câu hỏi" ? "" : content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePasteImage}
                placeholder={`Nhập nội dung câu hỏi ${questionIndex + 1}...`}
                rows={3}
                className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                autoFocus
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-1.5 -mt-2 text-[11px] text-[var(--muted-foreground)]">
              <span className="inline-flex items-center gap-1.5">
                <Clipboard className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                <span>
                  Mẹo: Nhấn <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] font-mono text-[10px] text-[var(--foreground)] font-semibold shadow-2xs">Ctrl + V</kbd> để dán nhanh ảnh chụp màn hình vào đây
                </span>
              </span>
              {isUploadingImage && (
                <span className="inline-flex items-center gap-1.5 text-[var(--primary)] font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang tải ảnh lên...
                </span>
              )}
            </div>

            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowImageField(!showImageField)}
                className="text-xs border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
              >
                <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                {showImageField ? "Ẩn hình ảnh" : "Thêm ảnh minh họa"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
              >
                <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
                {showExplanation ? "Ẩn lời giải" : "Thêm lời giải"}
              </Button>
            </div>

            {/* Image Selection / Upload Section */}
            {showImageField && (
              <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4 bg-[var(--card-secondary)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    Hình ảnh minh họa cho câu hỏi
                  </span>
                  {imagePath && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearImage}
                      className="h-6 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-2 rounded-lg"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Gỡ ảnh
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <label className="flex items-center gap-1.5 text-[var(--foreground)] cursor-pointer">
                    <input
                      type="radio"
                      name={`imgSource-${question.id}`}
                      value="file"
                      checked={imageSourceType === "file"}
                      onChange={() => setImageSourceType("file")}
                      className="h-3.5 w-3.5 text-[var(--primary)] accent-[var(--primary)]"
                    />
                    Tải ảnh từ máy tính
                  </label>
                  <label className="flex items-center gap-1.5 text-[var(--foreground)] cursor-pointer">
                    <input
                      type="radio"
                      name={`imgSource-${question.id}`}
                      value="url"
                      checked={imageSourceType === "url"}
                      onChange={() => setImageSourceType("url")}
                      className="h-3.5 w-3.5 text-[var(--primary)] accent-[var(--primary)]"
                    />
                    Nhập liên kết hình ảnh (URL)
                  </label>
                </div>

                {imageSourceType === "file" ? (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Đang tải ảnh lên...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            {imagePath ? "Chọn ảnh khác từ máy" : "Chọn ảnh từ máy tính"}
                          </>
                        )}
                      </Button>
                      <span className="text-xs text-[var(--muted-foreground)] inline-flex items-center gap-1">
                        hoặc dán trực tiếp <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] font-mono text-[10px] text-[var(--foreground)] font-semibold shadow-2xs">Ctrl + V</kbd>
                      </span>
                    </div>
                    {fileError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {fileError}
                      </p>
                    )}
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Hỗ trợ định dạng PNG, JPG, WebP, GIF, SVG (dung lượng tối đa 5MB).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input
                      type="url"
                      placeholder="https://example.com/hinh-anh.png"
                      value={imagePath.startsWith("data:") ? "" : imagePath}
                      onChange={(e) => setImagePath(e.target.value)}
                      className="text-xs h-9 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)]"
                    />
                  </div>
                )}

                {imagePath && (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                    <img
                      src={imagePath}
                      alt="Xem trước hình ảnh minh họa"
                      className="max-h-48 rounded-lg border border-[var(--border)] object-contain bg-[var(--card)]"
                    />
                  </div>
                )}
              </div>
            )}

            {showExplanation && (
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Lời giải chi tiết
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Giải thích chi tiết phương pháp giải..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                />
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--divider)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveContent}
                className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20"
              >
                Lưu câu hỏi
              </Button>
            </div>
          </div>
        ) : (
          /* Question Content View */
          <div
            onClick={() => !readOnly && setEditingMode("content")}
            className={cn(
              "group/qcontent rounded-xl p-3 transition-colors border border-transparent",
              !readOnly && "cursor-pointer hover:bg-[var(--surface-hover)] hover:border-[var(--border)]"
            )}
            title={!readOnly ? "Bấm vào để chỉnh sửa nội dung câu hỏi" : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {question.content &&
                  question.content.trim().length > 0 &&
                  question.content !== "Nhập câu hỏi" ? (
                    question.content
                  ) : question.image_path ? (
                    <span className="text-[var(--muted-foreground)] italic font-normal text-xs">
                      [Nội dung câu hỏi bằng hình ảnh]
                    </span>
                  ) : (
                    <span className="text-[var(--muted-foreground)] italic font-normal">
                      Câu {questionIndex + 1}: [Chưa nhập nội dung câu hỏi — Bấm vào để soạn nội dung hoặc dán ảnh]
                    </span>
                  )}
                </p>
              </div>
              {!readOnly && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] group-hover/qcontent:text-[var(--primary)] transition-colors shrink-0 mt-0.5">
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-[11px] opacity-80">(Sửa câu hỏi)</span>
                </span>
              )}
            </div>

            {question.image_path && (
              <div className="mt-3">
                <img
                  src={question.image_path}
                  alt={`Minh họa câu ${questionIndex + 1}`}
                  className="max-h-60 rounded-xl border border-[var(--border)] object-contain bg-[var(--surface)] p-1 shadow-xs"
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* QUESTION ANSWER SECTIONS                                                  */}
        {/* ========================================================================= */}

        {/* 1. Multiple Choice Options */}
        {isMcq && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Các phương án lựa chọn (Chọn 1 đáp án đúng)
              </span>
            </div>

            <div className="space-y-2">
              {activeOptions.map((opt, optIndex) => (
                <BuilderOptionItem
                  key={opt.id}
                  option={opt}
                  index={optIndex}
                  readOnly={readOnly}
                  canDelete={!isTemplateFixed && activeOptions.length > 2}
                  onUpdateContent={(optId, text) => onUpdateOptionContent(optId, text)}
                  onSetCorrect={(optId) => onSetCorrectOption(optId)}
                  onDelete={(optId) => onDeleteOption(optId)}
                />
              ))}
            </div>

            {!readOnly && !isTemplateFixed && (
              <div className="pt-2">
                <InsertPlaceholder
                  size="sm"
                  label="Thêm phương án lựa chọn (+)"
                  onClick={() => onAddOption(question.id)}
                />
              </div>
            )}
          </div>
        )}

        {/* 2. True / False Group: 4 Statements with [ Đúng ] / [ Sai ] toggles */}
        {isTfGroup && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Các ý khẳng định (Đánh dấu Đúng / Sai cho từng ý)
              </span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Thang điểm chuẩn: 1 ý (0.1đ) · 2 ý (0.25đ) · 3 ý (0.5đ) · 4 ý (1.0đ)
              </span>
            </div>

            <div className="space-y-2.5">
              {activeOptions.map((opt, optIndex) => {
                const letter = ["a", "b", "c", "d", "e", "f"][optIndex] || `${optIndex + 1}`;
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border p-3 transition-all",
                      opt.is_correct
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-rose-500/30 bg-rose-500/5"
                    )}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)]">
                        {letter}
                      </span>
                      <div className="flex-1 min-w-0">
                        {readOnly ? (
                          <p className="text-sm text-[var(--foreground)]">
                            {opt.content && !opt.content.startsWith(`Ý ${letter}: Khẳng định`) ? (
                              opt.content
                            ) : (
                              <span className="italic text-[var(--muted-foreground)]">[Chưa nhập khẳng định {letter}]</span>
                            )}
                          </p>
                        ) : (
                          <input
                            type="text"
                            defaultValue={opt.content.startsWith(`Ý ${letter}: Khẳng định`) ? "" : opt.content}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== opt.content) {
                                onUpdateOptionContent(opt.id, val);
                              }
                            }}
                            placeholder={`Nội dung khẳng định ${letter}...`}
                            className="w-full bg-transparent px-2 py-1 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-lg hover:bg-[var(--surface-hover)] focus:bg-[var(--input-bg)] focus:ring-2 focus:ring-[var(--ring)]/20 border-transparent focus:border-[var(--primary)] border transition-colors outline-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* True / False Toggle Switches */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onSetCorrectOption(opt.id, true)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          opt.is_correct
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:border-emerald-500 hover:text-emerald-600"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Đúng
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onSetCorrectOption(opt.id, false)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          !opt.is_correct
                            ? "bg-rose-600 text-white shadow-xs"
                            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:border-rose-500 hover:text-rose-600"
                        )}
                      >
                        <X className="h-3.5 w-3.5" />
                        Sai
                      </button>

                      {!readOnly && !isTemplateFixed && activeOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => onDeleteOption(opt.id)}
                          className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-500/10 ml-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!readOnly && !isTemplateFixed && (
              <div className="pt-2">
                <InsertPlaceholder
                  size="sm"
                  label="Thêm ý khẳng định (+)"
                  onClick={() => onAddOption(question.id)}
                />
              </div>
            )}
          </div>
        )}

        {/* 3. Short Answer Section */}
        {isShortAnswer && (
          <div>
            {editingMode === "answer" && !readOnly ? (
              /* State 2: Edit Answer Only */
              <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <Calculator className="h-4 w-4" />
                    Chỉnh sửa đáp án chuẩn & Sai số
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-[var(--foreground)]">
                    Đáp án chuẩn (VD: 1/2, 0.5, -3, 1.4142)
                    <Input
                      placeholder="Nhập số hoặc phân số..."
                      value={correctAnswerRaw}
                      onChange={(e) => setCorrectAnswerRaw(e.target.value)}
                      className="mt-1 bg-[var(--card)] font-mono font-bold text-sm"
                      autoFocus
                    />
                  </label>

                  <label className="block text-xs font-semibold text-[var(--foreground)]">
                    Sai số cho phép (Tolerance)
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={tolerance}
                      onChange={(e) => setTolerance(e.target.value)}
                      className="mt-1 bg-[var(--card)] font-mono text-sm"
                    />
                  </label>
                </div>

                {/* Detailed Helper & Explanations */}
                <div className="rounded-xl border border-blue-500/20 bg-[var(--card)] p-3.5 text-xs text-[var(--foreground)] space-y-2">
                  <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Hướng dẫn chấm điểm & chuẩn hóa toán học:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--muted-foreground)]">
                    <li>
                      <strong className="text-[var(--foreground)]">Sai số cho phép:</strong> Là khoảng chênh lệch tối đa giữa đáp án của học sinh và đáp án đúng.
                      <br />
                      <em>Ví dụ: Đáp án đúng là <code className="text-blue-600 dark:text-blue-400 font-mono">1.4142</code>, sai số <code className="text-blue-600 dark:text-blue-400 font-mono">0.001</code> → các giá trị từ <code className="font-mono">1.4132</code> đến <code className="font-mono">1.4152</code> đều được chấm đúng.</em>
                    </li>
                    <li>
                      <strong className="text-[var(--foreground)]">Khi sai số = 0:</strong> Hệ thống yêu cầu giá trị toán học phải khớp chính xác (không phân biệt cách viết chuỗi).
                      <br />
                      <em>Ví dụ: Đáp án chuẩn là <code className="text-blue-600 dark:text-blue-400 font-mono">1/2</code> thì học sinh nhập <code className="font-mono">0.5</code>, <code className="font-mono">0,5</code> hoặc <code className="font-mono">2/4</code> đều được coi là đúng.</em>
                    </li>
                    <li>
                      <strong className="text-[var(--foreground)]">Số vô tỉ hoặc làm tròn (√2, π, √3/2):</strong> Hãy nhập đáp án dưới dạng số hoặc phân số (VD: <code className="font-mono">1.4142</code> hoặc <code className="font-mono">14142/10000</code>) và đặt một sai số nhỏ như <code className="text-blue-600 dark:text-blue-400 font-mono">0.0001</code> để chấp nhận kết quả làm tròn của học sinh.
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-500/20">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveAnswer}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
                  >
                    Lưu đáp án
                  </Button>
                </div>
              </div>
            ) : (
              /* View Short Answer */
              <div
                onClick={() => !readOnly && setEditingMode("answer")}
                className={cn(
                  "group/shortAns rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2.5 transition-all duration-200",
                  !readOnly && "cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-xs"
                )}
                title={!readOnly ? "Bấm vào ô này để chỉnh sửa đáp án chuẩn & sai số" : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5" />
                    Đáp án trả lời ngắn chuẩn
                  </span>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMode("answer");
                      }}
                      className="h-7 text-xs border-blue-500/30 bg-[var(--card)] text-blue-600 dark:text-blue-400 group-hover/shortAns:bg-blue-600 group-hover/shortAns:text-white group-hover/shortAns:border-blue-600 rounded-xl transition-colors"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Sửa đáp án
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-[var(--foreground)]">
                  <div>
                    <span className="text-xs text-[var(--muted-foreground)] block">Đáp án mong đợi:</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {question.correct_answer_raw ? (
                        question.correct_answer_raw
                      ) : (
                        <span className="text-amber-500 font-sans italic text-xs font-normal">
                          Chưa cấu hình (Bấm vào đây để nhập)
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--muted-foreground)] block">Sai số cho phép:</span>
                    <span className="text-sm font-semibold font-mono">
                      {question.tolerance !== undefined && question.tolerance !== null && question.tolerance > 0
                        ? `± ${question.tolerance}`
                        : "Không cho phép (± 0)"}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--muted-foreground)] italic pt-0.5">
                  ℹ Hệ thống tự động so khớp phân số (1/2 = 0.5 = 2/4), số âm và dấu phẩy thập phân.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Explanation Preview if available and not editing content */}
        {editingMode !== "content" && question.explanation && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-900 dark:text-blue-200">
            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1">
              <HelpCircle className="h-3.5 w-3.5" />
              Lời giải chi tiết:
            </span>
            <p className="text-[var(--foreground)] whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
