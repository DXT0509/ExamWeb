"use client";

import { useState } from "react";
import {
  GripVertical,
  BookOpen,
  Pencil,
  Check,
  X,
  MoreVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BuilderQuestionCard, type QuestionData } from "./builder-question-card";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { InsertPlaceholder } from "./insert-placeholder";

export interface SectionData {
  id: string;
  exam_id: string;
  title: string;
  description: string | null;
  position: number;
  deleted_at?: string | null;
  questions: QuestionData[];
}

interface BuilderSectionItemProps {
  section: SectionData;
  sectionIndex: number;
  totalSections: number;
  readOnly: boolean;
  onUpdateSection: (sectionId: string, title: string, description: string | null) => Promise<void> | void;
  onDeleteSection: (sectionId: string) => Promise<void> | void;
  onAddQuestion: (sectionId: string) => Promise<void> | void;
  onUpdateQuestion: (questionId: string, payload: Partial<QuestionData>) => Promise<void> | void;
  onDeleteQuestion: (questionId: string) => Promise<void> | void;
  onAddOption: (questionId: string) => Promise<void> | void;
  onUpdateOptionContent: (optionId: string, newContent: string) => Promise<void> | void;
  onSetCorrectOption: (questionId: string, optionId: string) => Promise<void> | void;
  onDeleteOption: (optionId: string) => Promise<void> | void;
  onMoveSection?: (direction: "up" | "down") => void;
  onMoveQuestion?: (sectionId: string, fromIndex: number, toIndex: number) => void;
  onDragStartSection?: (e: React.DragEvent) => void;
  onDragOverSection?: (e: React.DragEvent) => void;
  onDropSection?: (e: React.DragEvent) => void;
}

export function BuilderSectionItem({
  section,
  sectionIndex,
  totalSections,
  readOnly,
  onUpdateSection,
  onDeleteSection,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddOption,
  onUpdateOptionContent,
  onSetCorrectOption,
  onDeleteOption,
  onMoveSection,
  onMoveQuestion,
  onDragStartSection,
  onDragOverSection,
  onDropSection,
}: BuilderSectionItemProps) {
  const [prevSection, setPrevSection] = useState(section);
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? "");

  if (prevSection !== section) {
    setPrevSection(section);
    setTitle(section.title);
    setDescription(section.description ?? "");
  }

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const activeQuestions = (section.questions ?? []).filter((q) => !q.deleted_at);
  const totalScore = activeQuestions.reduce((acc, q) => acc + (q.score || 0), 0);

  const handleSaveSection = () => {
    if (!title.trim()) return;
    onUpdateSection(section.id, title.trim(), description.trim() || null);
    setIsEditingTitle(false);
  };

  return (
    <div
      draggable={!readOnly && !isEditingTitle}
      onDragStart={onDragStartSection}
      onDragOver={onDragOverSection}
      onDrop={onDropSection}
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg transition-all duration-200 overflow-hidden",
        "hover:border-[var(--primary)]/30"
      )}
    >
      {/* Section Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 bg-[var(--card-secondary)] border-b border-[var(--divider)]">
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          {!readOnly && (
            <button
              type="button"
              aria-label="Kéo thả để sắp xếp phần thi"
              className="cursor-grab active:cursor-grabbing text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors mt-0.5 sm:mt-0"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-blue-600/30 shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            {isEditingTitle && !readOnly ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tên phần thi..."
                  className="font-bold text-base h-9 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)]"
                  autoFocus
                />
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt cho phần thi này..."
                  className="text-xs h-8 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)]"
                />
                <div className="flex items-center gap-2 mt-1">
                  <Button size="sm" onClick={handleSaveSection} className="h-7 text-xs px-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg">
                    <Check className="mr-1 h-3 w-3" /> Lưu
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTitle(section.title);
                      setDescription(section.description ?? "");
                      setIsEditingTitle(false);
                    }}
                    className="h-7 text-xs px-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg"
                  >
                    <X className="mr-1 h-3 w-3" /> Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !readOnly && setIsEditingTitle(true)}
                className={cn(
                  "group/title rounded-lg py-1 px-2 -ml-2 transition-colors",
                  !readOnly && "cursor-pointer hover:bg-[var(--surface-hover)]"
                )}
                title={!readOnly ? "Bấm vào để đổi tên phần thi" : undefined}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                    {section.title.toLowerCase().startsWith(`phần ${sectionIndex + 1}`)
                      ? section.title
                      : `Phần ${sectionIndex + 1}: ${section.title}`}
                  </h2>
                  {!readOnly && (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] group-hover/title:text-[var(--primary)] transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[11px] opacity-80">(Sửa phần thi)</span>
                    </span>
                  )}
                </div>
                {section.description && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{section.description}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section Stats & Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)] bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-xs">
            <span>{activeQuestions.length} câu hỏi</span>
            <span>·</span>
            <span className="text-[var(--primary)]">{totalScore.toFixed(2).replace(/\.00$/, "")} điểm</span>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1">
              {/* Keyboard Accessibility Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="Tùy chọn phần thi"
                  className="rounded-xl p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
                      disabled={sectionIndex === 0}
                      onClick={() => {
                        onMoveSection?.("up");
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      <span>Chuyển lên trên</span>
                    </button>
                    <button
                      type="button"
                      disabled={sectionIndex === totalSections - 1}
                      onClick={() => {
                        onMoveSection?.("down");
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      <span>Chuyển xuống dưới</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTitle(true);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Đổi tên phần thi</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Section Dialog */}
              <DeleteConfirmDialog
                title="Xóa phần thi này?"
                description={`Tất cả ${activeQuestions.length} câu hỏi và đáp án bên trong phần thi "${section.title}" sẽ bị xóa.`}
                ariaLabel="Xóa phần thi này"
                onConfirm={() => onDeleteSection(section.id)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Questions Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {activeQuestions.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--card-secondary)] p-6">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Phần thi này chưa có câu hỏi nào
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 mb-4">
              Bắt đầu tạo câu hỏi trắc nghiệm đầu tiên cho phần thi này.
            </p>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                onClick={() => onAddQuestion(section.id)}
                className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md shadow-blue-600/20 rounded-xl"
              >
                + Thêm câu hỏi đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeQuestions.map((question, qIndex) => (
              <BuilderQuestionCard
                key={question.id}
                question={question}
                questionIndex={qIndex}
                totalQuestions={activeQuestions.length}
                readOnly={readOnly}
                onUpdateQuestion={(payload) => onUpdateQuestion(question.id, payload)}
                onDeleteQuestion={() => onDeleteQuestion(question.id)}
                onAddOption={() => onAddOption(question.id)}
                onUpdateOptionContent={onUpdateOptionContent}
                onSetCorrectOption={(optionId) => onSetCorrectOption(question.id, optionId)}
                onDeleteOption={onDeleteOption}
                onMoveQuestion={(dir) => {
                  const target = dir === "up" ? qIndex - 1 : qIndex + 1;
                  if (target >= 0 && target < activeQuestions.length) {
                    onMoveQuestion?.(section.id, qIndex, target);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Add Question Placeholder */}
        {!readOnly && activeQuestions.length > 0 && (
          <InsertPlaceholder
            label="Thêm câu hỏi mới vào phần thi này"
            onInsert={() => onAddQuestion(section.id)}
          />
        )}
      </div>
    </div>
  );
}
