import Link from "next/link";
import { ArrowRight, Clock, FileQuestion, Maximize2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamCatalogItem } from "@/lib/exams/catalog";

const accessLabels = {
  public: "Công khai",
  students_only: "Dành cho học sinh",
  private: "Riêng tư",
} as const;

export function ExamCard({ exam }: { exam: ExamCatalogItem }) {
  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden border border-[var(--border)] bg-[var(--card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/40 hover:shadow-xl hover:shadow-blue-500/5">
      <CardHeader className="space-y-3 pb-3">
        {/* Pills / Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border">
            {exam.subjectName}
          </Badge>
          {exam.categoryName ? (
            <Badge className="border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted-foreground)] border">
              {exam.categoryName}
            </Badge>
          ) : null}
          <Badge
            className={
              exam.accessType === "public"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border"
                : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border"
            }
          >
            {accessLabels[exam.accessType]}
          </Badge>
          {exam.allowGuestAttempt ? (
            <Badge className="border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 border">
              Khách có thể làm
            </Badge>
          ) : null}
          {exam.fullscreenRequired ? (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 border">
              Toàn màn hình
            </Badge>
          ) : null}
        </div>

        {/* Title */}
        <CardTitle className="text-lg font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
          {exam.title}
        </CardTitle>

        {exam.description && (
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
            {exam.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-3 text-xs text-[var(--foreground)] sm:grid-cols-4">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{exam.durationMinutes} phút</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <FileQuestion className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{exam.questionCount} câu</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{exam.totalScore} điểm</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Maximize2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{exam.fullscreenRequired ? "Bắt buộc" : "Tự do"}</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          asChild
          variant="outline"
          className="w-full justify-between group/btn border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all rounded-xl"
        >
          <Link href={`/exams/${exam.slug}`}>
            <span>Xem chi tiết & Làm bài</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
