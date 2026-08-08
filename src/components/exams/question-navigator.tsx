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
          <Button key={index} variant={index === 0 ? "default" : "outline"} size="sm">
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
                "relative font-medium transition-colors",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                item.isMarked && "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100",
                !isCurrent && item.isAnswered && !item.isMarked && "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-100"
              )}
            >
              {item.index}
              {item.isMarked && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500" title="Đã đánh dấu" />
              )}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-[var(--muted-foreground)] gap-2 pt-2 border-t">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border bg-white dark:bg-slate-900 inline-block" />
          <span>Chưa làm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
          <span>Đã làm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-100 border border-amber-500 inline-block" />
          <span>Đánh dấu</span>
        </div>
      </div>
    </div>
  );
}
