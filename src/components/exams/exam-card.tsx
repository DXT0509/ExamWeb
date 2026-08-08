import Link from "next/link";
import { Clock, FileQuestion, Maximize2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamCatalogItem } from "@/lib/exams/catalog";

const accessLabels = {
  public: "Công khai",
  students_only: "Yêu cầu đăng nhập",
  private: "Riêng tư",
} as const;

export function ExamCard({ exam }: { exam: ExamCatalogItem }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{exam.subjectName}</Badge>
          {exam.categoryName ? <Badge className="bg-[var(--muted)]">{exam.categoryName}</Badge> : null}
          <Badge>{accessLabels[exam.accessType]}</Badge>
          {exam.allowGuestAttempt ? <Badge>Làm được khi chưa đăng nhập</Badge> : null}
          {exam.fullscreenRequired ? <Badge>Bắt buộc toàn màn hình</Badge> : null}
        </div>
        <CardTitle>{exam.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> {exam.durationMinutes} phút
          </span>
          <span className="inline-flex items-center gap-1">
            <FileQuestion className="h-4 w-4" /> {exam.questionCount} câu
          </span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-4 w-4" /> {exam.totalScore} điểm
          </span>
          <span className="inline-flex items-center gap-1">
            <Maximize2 className="h-4 w-4" /> {exam.fullscreenRequired ? "Có toàn màn hình" : "Không bắt buộc"}
          </span>
        </div>
        <Button asChild variant="outline">
          <Link href={`/exams/${exam.slug}`}>Xem chi tiết</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
