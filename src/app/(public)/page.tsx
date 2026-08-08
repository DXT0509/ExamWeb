import Link from "next/link";
import { BookOpen, ClipboardCheck, ShieldCheck } from "lucide-react";
import { ExamCard } from "@/components/exams/exam-card";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { getFeaturedExams } from "@/lib/exams/catalog";

export default async function HomePage() {
  const featured = await getFeaturedExams(6);
  const features = [
    { label: "Thư viện rõ ràng", Icon: BookOpen },
    { label: "Trạng thái bài làm", Icon: ClipboardCheck },
    { label: "Bảo vệ đáp án", Icon: ShieldCheck },
  ];

  return (
    <div>
      <section className="border-b bg-white py-12">
        <div className="container-page grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <h1 className="text-4xl font-semibold">ExamPrep</h1>
            <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">
              Nền tảng luyện thi trực tuyến cho Guest, Student và Admin với thư viện đề thi lấy từ cơ sở dữ liệu thật.
            </p>
            <Button asChild className="mt-5"><Link href="/exams">Xem đề thi</Link></Button>
          </div>
          <div className="rounded-lg border bg-[var(--muted)] p-5">
            <p className="text-sm font-medium">Đề đã xuất bản</p>
            <p className="mt-2 text-3xl font-semibold">{featured.length} đề nổi bật</p>
            <p className="text-sm text-[var(--muted-foreground)]">Tìm kiếm, lọc và xem chi tiết theo quyền truy cập.</p>
          </div>
        </div>
      </section>
      <section className="container-page py-10">
        <h2 className="text-2xl font-semibold">Đề nổi bật</h2>
        {featured.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">{featured.map((exam) => <ExamCard key={exam.examId} exam={exam} />)}</div>
        ) : (
          <div className="mt-4"><EmptyState title="Hiện chưa có đề thi được xuất bản." /></div>
        )}
      </section>
      <section className="container-page grid gap-4 pb-10 md:grid-cols-3">
        {features.map(({ label, Icon }) => (
          <div key={label} className="rounded-lg border bg-white p-5">
            <Icon className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="mt-3 font-semibold">{label}</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Catalog public không tải câu hỏi, đáp án đúng hoặc lời giải.</p>
          </div>
        ))}
      </section>
    </div>
  );
}
