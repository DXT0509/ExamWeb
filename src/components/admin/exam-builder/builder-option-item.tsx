"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OptionData {
  id: string;
  question_id: string;
  content: string;
  position: number;
  is_correct: boolean;
  is_active: boolean;
  deleted_at: string | null;
}

interface BuilderOptionItemProps {
  option: OptionData;
  index: number;
  readOnly: boolean;
  canDelete: boolean;
  onUpdateContent: (id: string, newContent: string) => Promise<void> | void;
  onSetCorrect: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  autoFocus?: boolean;
}

export function BuilderOptionItem({
  option,
  index,
  readOnly,
  canDelete,
  onUpdateContent,
  onSetCorrect,
  onDelete,
  autoFocus = false,
}: BuilderOptionItemProps) {
  const [prevOptionContent, setPrevOptionContent] = useState(option.content);
  const [content, setContent] = useState(option.content);

  if (prevOptionContent !== option.content) {
    setPrevOptionContent(option.content);
    setContent(option.content);
  }

  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const letter = String.fromCharCode(65 + index); // A, B, C, D...

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleBlur = () => {
    setIsEditing(false);
    if (content.trim() !== option.content && content.trim().length > 0) {
      onUpdateContent(option.id, content.trim());
    } else {
      setContent(option.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-2.5 sm:p-3 transition-all duration-150",
        option.is_correct
          ? "border-emerald-500/40 bg-emerald-500/15 text-[var(--foreground)] shadow-xs"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
      )}
    >
      {/* Correct answer toggle button */}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onSetCorrect(option.id)}
        aria-label={`Đặt phương án ${letter} là đáp án đúng`}
        title={`Đặt phương án ${letter} là đáp án đúng`}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer",
          option.is_correct
            ? "bg-emerald-600 text-white shadow-xs"
            : "border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--foreground)] hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300"
        )}
      >
        {option.is_correct ? <Check className="h-4 w-4 stroke-[3]" /> : letter}
      </button>

      {/* Option Content Input (Inline) */}
      <div className="flex-1 min-w-0">
        {readOnly ? (
          <p className="text-sm text-[var(--foreground)] break-words py-1 px-1">
            <span className="font-semibold text-[var(--muted-foreground)] mr-2">{letter}.</span>
            {option.content}
          </p>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={content}
            disabled={readOnly}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={`Nhập nội dung lựa chọn ${letter}...`}
            className={cn(
              "w-full bg-transparent px-2 py-1 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors focus:outline-none",
              isEditing
                ? "rounded-lg bg-[var(--input-bg)] ring-2 ring-[var(--ring)]/20 border border-[var(--primary)]"
                : "border-transparent hover:bg-[var(--surface-hover)]/60 rounded-lg"
            )}
          />
        )}
      </div>

      {/* Correct Badge */}
      {option.is_correct && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
          <Check className="h-3 w-3" />
          Đáp án đúng
        </span>
      )}

      {/* Delete Option Button */}
      {!readOnly && canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(option.id);
          }}
          aria-label={`Xóa lựa chọn ${letter}`}
          title={`Xóa lựa chọn ${letter}`}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 shrink-0 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
