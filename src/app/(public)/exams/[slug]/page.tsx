import Link from "next/link";
import type { Metadata } from "next";
import { Clock, FileQuestion, Maximize2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartExamButton } from "@/components/exams/start-exam-button";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getExamBySlug } from "@/lib/exams/catalog";

const accessLabels = {
  public: "Công khai",
  students_only: "Yêu cầu đăng nhập",
  private: "Riêng tư",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const exam = await getExamBySlug(slug);
  if (!exam) return { title: "Đề thi không khả dụng | ExamPrep" };
  return {
    title: `${exam.title} | ExamPrep`,
    description: exam.description ?? `Chi tiết đề thi ${exam.title}`,
  };
}

export default async function ExamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [exam, profile] = await Promise.all([getExamBySlug(slug), getCurrentProfile()]);
  if (!exam) {
    return (
      <section className="container-page py-8">
        <Card>
          <CardHeader><CardTitle>Đề thi không khả dụng</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--muted-foreground)]">Đề thi này không tồn tại hoặc hiện không khả dụng.</p>
            <Button asChild variant="outline"><Link href="/exams">Về thư viện đề thi</Link></Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const isGuest = !profile;
  const isLocked = profile?.status === "locked";
  const canStartAsGuest = isGuest && exam.allowGuestAttempt;
  const canStartAsStudent = profile?.role === "student" && profile.status === "active";

  return (
    <section className="container-page py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge>{exam.subjectName}</Badge>
            {exam.categoryName ? <Badge className="bg-[var(--muted)]">{exam.categoryName}</Badge> : null}
            <Badge>{accessLabels[exam.accessType]}</Badge>
            {exam.allowGuestAttempt ? <Badge>Có thể làm khi chưa đăng nhập</Badge> : <Badge>Yêu cầu đăng nhập</Badge>}
            {exam.fullscreenRequired ? <Badge>Bắt buộc toàn màn hình</Badge> : null}
          </div>
          <CardTitle>{exam.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {exam.description ? <p className="text-[var(--muted-foreground)]">{exam.description}</p> : null}
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <p className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> Thời gian làm bài: {exam.durationMinutes} phút</p>
            <p className="inline-flex items-center gap-2"><FileQuestion className="h-4 w-4" /> Tổng số câu: {exam.questionCount}</p>
            <p className="inline-flex items-center gap-2"><Trophy className="h-4 w-4" /> Tổng điểm: {exam.totalScore}</p>
            <p className="inline-flex items-center gap-2"><Maximize2 className="h-4 w-4" /> {exam.fullscreenRequired ? "Bắt buộc toàn màn hình" : "Không bắt buộc toàn màn hình"}</p>
            <p>Hiện điểm sau khi nộp: {exam.showScoreAfterSubmit ? "Có" : "Không"}</p>
            <p>Hiện đáp án sau khi nộp: {exam.showAnswersAfterSubmit ? "Có" : "Không"}</p>
            <p>Hiện lời giải sau khi nộp: {exam.showSolutionsAfterSubmit ? "Có" : "Không"}</p>
            {exam.publishedAt ? <p>Ngày xuất bản: {new Intl.DateTimeFormat("vi-VN").format(new Date(exam.publishedAt))}</p> : null}
          </div>

          {isLocked ? <p className="text-sm font-medium text-red-700">Tài khoản của bạn hiện đang bị khóa.</p> : null}
          {(canStartAsGuest || canStartAsStudent) && !isLocked ? (
            <StartExamButton examId={exam.examId} fullscreenRequired={exam.fullscreenRequired} />
          ) : null}
          {isGuest && !exam.allowGuestAttempt ? (
            <Button asChild>
              <Link href={`/login?next=/exams/${exam.slug}`}>Đăng nhập để làm bài</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
