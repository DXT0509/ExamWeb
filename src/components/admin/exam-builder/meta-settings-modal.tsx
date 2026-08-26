"use client";

import { useState } from "react";
import { Settings, Save } from "lucide-react";
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
import { accessTypeLabels } from "@/lib/exams/constants";

export interface ExamMetaData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  subject_id: string;
  category_id: string | null;
  access_type: keyof typeof accessTypeLabels;
  allow_guest_attempt: boolean;
  fullscreen_required: boolean;
  show_score_after_submit: boolean;
  show_answers_after_submit: boolean;
  show_solutions_after_submit: boolean;
  total_score: number;
  status: string;
}

type SelectItem = { id: string; name: string };

interface MetaSettingsModalProps {
  exam: ExamMetaData;
  subjects: SelectItem[];
  categories: SelectItem[];
  readOnly: boolean;
  onSave: (payload: Partial<ExamMetaData>) => Promise<void> | void;
}

export function MetaSettingsModal({
  exam,
  subjects,
  categories,
  readOnly,
  onSave,
}: MetaSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description ?? "");
  const [durationMinutes, setDurationMinutes] = useState(exam.duration_minutes);
  const [subjectId, setSubjectId] = useState(exam.subject_id);
  const [categoryId, setCategoryId] = useState(exam.category_id ?? "");
  const [accessType, setAccessType] = useState(exam.access_type);
  const [allowGuestAttempt, setAllowGuestAttempt] = useState(exam.allow_guest_attempt);
  const [fullscreenRequired, setFullscreenRequired] = useState(exam.fullscreen_required);
  const [showScoreAfterSubmit, setShowScoreAfterSubmit] = useState(exam.show_score_after_submit);
  const [showAnswersAfterSubmit, setShowAnswersAfterSubmit] = useState(exam.show_answers_after_submit);
  const [showSolutionsAfterSubmit, setShowSolutionsAfterSubmit] = useState(exam.show_solutions_after_submit);

  const handleOpen = () => {
    setTitle(exam.title);
    setDescription(exam.description ?? "");
    setDurationMinutes(exam.duration_minutes);
    setSubjectId(exam.subject_id);
    setCategoryId(exam.category_id ?? "");
    setAccessType(exam.access_type);
    setAllowGuestAttempt(exam.allow_guest_attempt);
    setFullscreenRequired(exam.fullscreen_required);
    setShowScoreAfterSubmit(exam.show_score_after_submit);
    setShowAnswersAfterSubmit(exam.show_answers_after_submit);
    setShowSolutionsAfterSubmit(exam.show_solutions_after_submit);
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        duration_minutes: durationMinutes,
        subject_id: subjectId,
        category_id: categoryId || null,
        access_type: accessType,
        allow_guest_attempt: accessType === "public" ? allowGuestAttempt : false,
        fullscreen_required: fullscreenRequired,
        show_score_after_submit: showScoreAfterSubmit,
        show_answers_after_submit: showAnswersAfterSubmit,
        show_solutions_after_submit: showSolutionsAfterSubmit,
      });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
      >
        <Settings className="mr-1.5 h-4 w-4 text-[var(--muted-foreground)]" />
        <span>Cài đặt đề thi</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader className="border-b border-[var(--divider)] pb-3">
              <DialogTitle className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Cài đặt & Cấu hình đề thi
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted-foreground)]">
                Chỉnh sửa thông tin chung, thời gian, môn học và quyền làm bài.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)] sm:col-span-2">
                <span>Tiêu đề đề thi</span>
                <Input
                  value={title}
                  disabled={readOnly}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="text-sm"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                <span>Môn học</span>
                <select
                  value={subjectId}
                  disabled={readOnly}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
                >
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                <span>Thời gian làm bài (phút)</span>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={durationMinutes}
                  disabled={readOnly}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                  required
                  className="text-sm"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                <span>Danh mục kỳ thi</span>
                <select
                  value={categoryId}
                  disabled={readOnly}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
                >
                  <option value="">Không chọn</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                <span>Quyền truy cập</span>
                <select
                  value={accessType}
                  disabled={readOnly}
                  onChange={(e) => setAccessType(e.target.value as keyof typeof accessTypeLabels)}
                  className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
                >
                  {Object.entries(accessTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-[var(--foreground)] sm:col-span-2">
                <span>Mô tả đề thi</span>
                <textarea
                  value={description}
                  disabled={readOnly}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2.5 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
                />
              </label>

              <div className="grid gap-3 sm:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4">
                <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowGuestAttempt}
                    disabled={readOnly || accessType !== "public"}
                    onChange={(e) => setAllowGuestAttempt(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
                  />
                  <span>Cho phép Khách (Guest) làm bài</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fullscreenRequired}
                    disabled={readOnly}
                    onChange={(e) => setFullscreenRequired(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
                  />
                  <span>Bắt buộc chế độ toàn màn hình khi làm bài</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScoreAfterSubmit}
                    disabled={readOnly}
                    onChange={(e) => setShowScoreAfterSubmit(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
                  />
                  <span>Hiển thị điểm số ngay sau khi nộp bài</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnswersAfterSubmit}
                    disabled={readOnly}
                    onChange={(e) => setShowAnswersAfterSubmit(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
                  />
                  <span>Hiển thị đáp án đúng/sai sau khi nộp bài</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSolutionsAfterSubmit}
                    disabled={readOnly}
                    onChange={(e) => setShowSolutionsAfterSubmit(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
                  />
                  <span>Hiển thị lời giải chi tiết sau khi nộp bài</span>
                </label>
              </div>
            </div>

            <DialogFooter className="border-t border-[var(--divider)] pt-3 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                Đóng
              </Button>
              {!readOnly && (
                <Button type="submit" disabled={isSaving} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
                  <Save className="mr-1.5 h-4 w-4" />
                  {isSaving ? "Đang lưu..." : "Lưu cài đặt"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
