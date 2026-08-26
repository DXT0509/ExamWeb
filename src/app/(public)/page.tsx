import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  GraduationCap,
  Layers,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { getFeaturedExams } from "@/lib/exams/catalog";
import { listPublicDocuments } from "@/lib/documents/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export const revalidate = 0;

function formatPublishDate(dateStr: string | null): string {
  if (!dateStr) return "Mới xuất bản";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Mới xuất bản";
  }
}

export default async function HomePage() {
  const [featured, docs, user] = await Promise.all([
    getFeaturedExams(24),
    listPublicDocuments({}).catch(() => []),
    getCurrentProfile(),
  ]);

  // 1. Top Quick Action Cards (3-column grid)
  const quickActionCards = [
    {
      icon: Rocket,
      iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      title: "Đề thi thử THPT & HSA",
      subtitle: "Bộ đề chuẩn cấu trúc, bấm giờ thời gian thực",
      href: "/exams",
    },
    {
      icon: Code2,
      iconColor: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      title: "Luyện trắc nghiệm nhanh",
      subtitle: "Ngân hàng câu hỏi phân cấp từ cơ bản đến nâng cao",
      href: "/exams",
    },
    {
      icon: Zap,
      iconColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      title: "Phòng thi trực tuyến",
      subtitle: "Chế độ toàn màn hình, chống gian lận tuyệt đối",
      href: "/exams",
    },
    {
      icon: MessageSquare,
      iconColor: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      title: "Trợ lý AI & Lời giải chi tiết",
      subtitle: "Phân tích đáp án thông minh và gợi ý kiến thức hổng",
      href: "/exams",
    },
    {
      icon: Layers,
      iconColor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      title: "Chuyên đề & Môn học",
      subtitle: "Toán học, Tiếng Anh, Vật lý, Hóa học, Sinh học",
      href: "/exams",
    },
    {
      icon: FileText,
      iconColor: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      title: "Tài liệu & Đề cương",
      subtitle: "Kho giáo trình ôn thi, slide bài giảng chọn lọc",
      href: "/documents",
    },
  ];

  // 2. Value / Highlight Cards
  const highlightCards = [
    {
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      title: "Cam kết chất lượng",
      description: "Đề thi biên soạn chuẩn ma trận, nội dung cập nhật liên tục, hỗ trợ học tập 24/7.",
    },
    {
      icon: Clock,
      iconColor: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      title: "Đúng tiến độ",
      description: "Chấm điểm tức thì sau khi nộp bài, phân tích xếp hạng và thống kê biểu đồ tiến bộ.",
    },
    {
      icon: ShieldCheck,
      iconColor: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      title: "Bảo mật tuyệt đối",
      description: "Dữ liệu bài làm được mã hóa, tự động sao lưu định kỳ và bảo vệ quyền riêng tư người học.",
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Hidden H1 for SEO and rendering tests */}
      <h1 className="sr-only">ExamPrep</h1>

      {/* Row 1: Top Quick Action Cards (3-column grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActionCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/40 hover:shadow-xl"
            >
              <div className="space-y-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.iconColor} transition-transform group-hover:scale-110`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Row 2: Value Proposition / Trust Badges (3-column grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {highlightCards.map((hl, idx) => {
          const Icon = hl.icon;
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-lg shadow-black/5"
            >
              <div className="space-y-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${hl.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">{hl.title}</h3>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {hl.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 3: Featured Exams (ChoCode Row Card Style) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-lg">
            <span className="text-[var(--primary)]">💠</span>
            <span>Đề thi mới nhất</span>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
          >
            <Link href="/exams" className="flex items-center gap-1.5">
              <span>Xem đề thi</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {featured.length > 0 ? (
          <div className="space-y-3">
            {featured.slice(0, 8).map((exam) => (
              <div
                key={exam.examId}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-sm transition-all duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--card-hover)]"
              >
                {/* Left info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--primary)] group-hover:border-[var(--primary)]/40 transition-colors">
                    <GraduationCap className="h-5 w-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {exam.subjectName}
                      </span>
                      {exam.categoryName && (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          {exam.categoryName}
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {exam.durationMinutes} phút • {exam.questionCount} câu
                      </span>
                    </div>

                    <h4 className="font-bold text-[var(--foreground)] text-sm sm:text-base group-hover:text-[var(--primary)] transition-colors truncate">
                      {exam.title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[var(--muted-foreground)]" /> {formatPublishDate(exam.publishedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <Button
                    asChild
                    size="sm"
                    className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20 text-xs px-4"
                  >
                    <Link href={`/exams/${exam.slug}`}>
                      {user?.role === "admin" ? "Tổng quan đề →" : "Bắt đầu làm →"}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Hiện chưa có đề thi được xuất bản"
            description="Các đề thi đang được biên soạn và sẽ sớm ra mắt."
          />
        )}
      </div>

      {/* Row 4: Public Documents Highlight Section */}
      {docs.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-lg">
              <span className="text-[var(--cyan)]">📚</span>
              <span>Tài liệu & Đề cương tham khảo</span>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
            >
              <Link href="/documents" className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[var(--cyan)]" />
                <span>Xem tất cả tài liệu</span>
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                className="group flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/40"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <FileText className="h-4 w-4" />
                    <span>{doc.external_url ? "Liên kết ngoài" : "Tệp tài liệu"}</span>
                  </div>
                  <h4 className="font-bold text-[var(--foreground)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {doc.title}
                  </h4>
                  {doc.description && (
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[var(--divider)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {new Date(doc.updated_at).toLocaleDateString("vi-VN")}
                  </span>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 p-0 h-auto"
                  >
                    <Link href="/documents">Mở xem →</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: Sleek CTA Banner (Ẩn hoàn toàn nếu là Admin) */}
      {user?.role !== "admin" && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-[var(--card)] to-[var(--card)] p-6 sm:p-10 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="h-3.5 w-3.5" /> Bứt phá điểm số cùng ExamPrep
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--foreground)]">
              Sẵn sàng thử thách năng lực của bạn ngay hôm nay?
            </h3>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm leading-relaxed">
              Truy cập ngay kho đề thi phong phú, làm bài thi thử có tính giờ thời gian thực và nhận phân tích kết quả chi tiết.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30">
                <Link href="/exams">Bắt đầu làm bài ngay</Link>
              </Button>
              {!user && (
                <Button asChild variant="outline" size="lg" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                  <Link href="/login">Đăng nhập</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
