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
} from "lucide-react";
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
  question_options: OptionData[];
}

interface BuilderQuestionCardProps {
  question: QuestionData;
  questionIndex: number;
  totalQuestions: number;
  readOnly: boolean;
  onUpdateQuestion: (payload: Partial<QuestionData>) => Promise<void> | void;
  onDeleteQuestion: (id: string) => Promise<void> | void;
  onAddOption: (questionId: string) => Promise<void> | void;
  onUpdateOptionContent: (optionId: string, newContent: string) => Promise<void> | void;
  onSetCorrectOption: (optionId: string) => Promise<void> | void;
  onDeleteOption: (optionId: string) => Promise<void> | void;
  onMoveQuestion?: (direction: "up" | "down") => void;
}

export function BuilderQuestionCard({
  question,
  questionIndex,
  totalQuestions,
  readOnly,
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
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [imagePath, setImagePath] = useState(question.image_path ?? "");

  if (prevQuestion !== question) {
    setPrevQuestion(question);
    setContent(question.content);
    setScore(question.score.toString());
    setExplanation(question.explanation ?? "");
    setImagePath(question.image_path ?? "");
  }

  const [isEditing, setIsEditing] = useState(false);
  const [showExplanation, setShowExplanation] = useState(Boolean(question.explanation));
  const [showImageField, setShowImageField] = useState(Boolean(question.image_path));
  const [showMenu, setShowMenu] = useState(false);

  // Image source type: File upload vs URL
  const [imageSourceType, setImageSourceType] = useState<"file" | "url">(
    question.image_path?.startsWith("http") ? "url" : "file"
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOptions = question.question_options
    .filter((o) => !o.deleted_at)
    .sort((a, b) => a.position - b.position);

  const hasCorrectOption = activeOptions.some((o) => o.is_correct);
  const hasEnoughOptions = activeOptions.length >= 2;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFileError("Dung lượng ảnh vượt quá giới hạn 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFileError("Vui lòng chọn tệp định dạng hình ảnh hợp lệ (PNG, JPG, WebP, GIF, SVG).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await uploadQuestionImageAction(uploadData);
      if (res.ok && res.url) {
        setImagePath(res.url);
      } else {
        setFileError(res.message || "Không thể tải ảnh lên.");
      }
    } catch {
      setFileError("Lỗi kết nối khi tải ảnh lên.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleClearImage = () => {
    setImagePath("");
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const numScore = parseFloat(score);
    const trimmedContent = content.trim();
    const finalContent =
      trimmedContent.length > 0 && trimmedContent !== "Nhập câu hỏi"
        ? trimmedContent
        : "Nhập câu hỏi";

    await onUpdateQuestion({
      content: finalContent,
      score: isNaN(numScore) || numScore <= 0 ? 1 : numScore,
      explanation: explanation.trim() ? explanation.trim() : null,
      image_path: imagePath.trim() ? imagePath.trim() : null,
    });
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group/card relative rounded-2xl border bg-[var(--card)] shadow-xs transition-all duration-200",
        isEditing
          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/10 shadow-md"
          : "border-[var(--border)] hover:border-[var(--border-subtle)] hover:shadow-sm"
      )}
    >
      {/* Question Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--divider)] bg-[var(--card-secondary)] px-4 py-3 sm:px-5 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          {/* Question Number Badge */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Câu {questionIndex + 1}
            </span>
            <span className="rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)] border border-[var(--border)]">
              {question.score} điểm
            </span>
          </div>

          {/* Validation Indicators */}
          {!readOnly && (
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              {!hasCorrectOption && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <AlertCircle className="h-3 w-3" />
                  Chưa chọn đáp án đúng
                </span>
              )}
              {!hasEnoughOptions && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 border border-rose-500/20">
                  <AlertCircle className="h-3 w-3" />
                  Cần ít nhất 2 phương án
                </span>
              )}
              {hasCorrectOption && hasEnoughOptions && (
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
              {/* Keyboard Accessibility Menu */}
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
                    className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl text-[var(--foreground)]"
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
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Chỉnh sửa nội dung</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Question Button (X Icon) */}
              <DeleteConfirmDialog
                title={`Xóa câu hỏi ${questionIndex + 1}?`}
                description="Câu hỏi và các phương án lựa chọn liên quan sẽ bị xóa khỏi đề thi."
                ariaLabel={`Xóa câu hỏi ${questionIndex + 1}`}
                onConfirm={() => onDeleteQuestion(question.id)}
              />
            </>
          )}
        </div>
      </div>

      {/* Question Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Question Content View / Edit */}
        {isEditing && !readOnly ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Nội dung câu hỏi
              <textarea
                value={content === "Nhập câu hỏi" ? "" : content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập câu hỏi..."
                rows={3}
                className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                autoFocus
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Điểm số
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="mt-1"
                />
              </label>

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

                {/* Source type selector: File vs URL */}
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
                    <div className="flex items-center gap-2">
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
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Dán liên kết hình ảnh trực tiếp (bắt đầu bằng https:// hoặc http://).
                    </p>
                  </div>
                )}

                {/* Live Preview of the Image */}
                {imagePath && (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                    <p className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5">
                      Xem trước hình ảnh:
                    </p>
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
                onClick={() => {
                  setContent(question.content);
                  setScore(question.score.toString());
                  setExplanation(question.explanation ?? "");
                  setImagePath(question.image_path ?? "");
                  setIsEditing(false);
                }}
                className="rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20"
              >
                Lưu nội dung
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !readOnly && setIsEditing(true)}
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
                  ) : (
                    <span className="text-[var(--muted-foreground)] italic font-normal">
                      Nhập câu hỏi
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

        {/* Options List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Các phương án lựa chọn
            </span>
          </div>

          <div className="space-y-2">
            {activeOptions.map((opt, optIndex) => (
              <BuilderOptionItem
                key={opt.id}
                option={opt}
                index={optIndex}
                readOnly={readOnly}
                canDelete={activeOptions.length > 2}
                onUpdateContent={(optId, text) => onUpdateOptionContent(optId, text)}
                onSetCorrect={(optId) => onSetCorrectOption(optId)}
                onDelete={(optId) => onDeleteOption(optId)}
              />
            ))}
          </div>

          {/* Add Option "+" Button */}
          {!readOnly && (
            <div className="pt-2">
              <InsertPlaceholder
                size="sm"
                label="Thêm phương án lựa chọn (+)"
                onClick={() => onAddOption(question.id)}
              />
            </div>
          )}
        </div>

        {/* Explanation Preview if available and not editing */}
        {!isEditing && question.explanation && (
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
