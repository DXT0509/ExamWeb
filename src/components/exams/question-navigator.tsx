"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuestionNavItem = {
  id: string;
  index: number; // 1-indexed global question position
  sectionTitle?: string;
  isAnswered: boolean;
  isMarked: boolean;
};

interface QuestionNavigatorProps {
  items: QuestionNavItem[];
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
}

export function QuestionNavigator({
  items = [],
  currentIndex = 0,
  onSelectQuestion,
}: QuestionNavigatorProps) {
  if (items.length === 0) {
    return (
      <div className="grid grid-cols-5 gap-2" aria-label="Danh sách câu hỏi">
        {Array.from({ length: 10 }, (_, index) => (
          <Button key={index} variant={index === 0 ? "default" : "outline"} size="sm" className="rounded-xl">
            {index + 1}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2" aria-label="Danh sách câu hỏi">
        {items.map((item) => {
          const isCurrent = item.index === currentIndex;
          let labelState = "Chưa trả lời";
          if (item.isAnswered) labelState = "Đã trả lời";
          if (item.isMarked) labelState += " (Đã đánh dấu)";

          return (
            <Button
              key={item.id}
              variant={isCurrent ? "default" : item.isAnswered ? "secondary" : "outline"}
              size="sm"
              onClick={() => onSelectQuestion(item.index)}
              aria-label={`Câu ${item.index} — ${labelState}`}
              className={cn(
                "relative font-semibold transition-all rounded-xl cursor-pointer text-xs h-9",
                isCurrent && "bg-[var(--primary)] text-white ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--background)] shadow-md shadow-blue-600/30",
                item.isMarked && "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
                !isCurrent && item.isAnswered && !item.isMarked && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25",
                !isCurrent && !item.isAnswered && !item.isMarked && "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              )}
            >
              {item.index}
              {item.isMarked && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" title="Đã đánh dấu" />
              )}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-[var(--muted-foreground)] gap-2 pt-3 border-t border-[var(--divider)]">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-[var(--border)] bg-[var(--surface)] inline-block" />
          <span>Chưa làm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
          <span>Đã làm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500/40 inline-block" />
          <span>Đánh dấu</span>
        </div>
      </div>
    </div>
  );
}
