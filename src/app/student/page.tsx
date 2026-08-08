import Link from "next/link";
import { ExamCard } from "@/components/exams/exam-card";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getStudentAvailableExams } from "@/lib/exams/catalog";

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();
  const isLocked = profile?.status === "locked";
  const catalog = isLocked
    ? { items: [], count: 0, page: 1, pageSize: 6, totalPages: 1 }
    : await getStudentAvailableExams({ q: "", subject: "", category: "", page: 1, pageSize: 6 });
  const publicExams = catalog.items.filter((exam) => exam.accessType === "public");
  const studentOnlyExams = catalog.items.filter((exam) => exam.accessType === "students_only");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tổng quan học sinh</h1>
        <Button asChild variant="outline"><Link href="/exams">Mở thư viện đề</Link></Button>
      </div>

      {isLocked ? (
        <EmptyState title="Tài khoản của bạn hiện đang bị khóa." />
      ) : null}

      <Card>
        <CardHeader><CardTitle>Bài đang làm</CardTitle></CardHeader>
        <CardContent>Bạn chưa có bài thi đang làm.</CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Đề mới</h2>
        {catalog.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{catalog.items.slice(0, 4).map((exam) => <ExamCard key={exam.examId} exam={exam} />)}</div>
        ) : (
          <EmptyState title="Chưa có đề thi phù hợp." />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Đề công khai</h2>
        {publicExams.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{publicExams.map((exam) => <ExamCard key={exam.examId} exam={exam} />)}</div>
        ) : (
          <EmptyState title="Chưa có đề thi công khai phù hợp." />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Đề chỉ dành cho học sinh</h2>
        {studentOnlyExams.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{studentOnlyExams.map((exam) => <ExamCard key={exam.examId} exam={exam} />)}</div>
        ) : (
          <EmptyState title="Chưa có đề thi dành riêng cho học sinh." />
        )}
      </section>

      <Card>
        <CardHeader><CardTitle>Lịch sử gần nhất</CardTitle></CardHeader>
        <CardContent>Lịch sử làm bài sẽ xuất hiện sau khi bạn hoàn thành đề thi.</CardContent>
      </Card>
    </div>
  );
}
