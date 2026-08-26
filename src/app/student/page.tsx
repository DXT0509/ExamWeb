import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  History,
  Lock,
  Maximize2,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { ExamCard } from "@/components/exams/exam-card";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getStudentAvailableExams } from "@/lib/exams/catalog";
import {
  getStudentStatistics,
  getStudentHistory,
} from "@/lib/exams/history-queries";

export const revalidate = 0;

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();
  const isLocked = profile?.status === "locked";

  const [catalog, stats, historyData] = await Promise.all([
    isLocked
      ? { items: [], count: 0, page: 1, pageSize: 6, totalPages: 1 }
      : getStudentAvailableExams({
          q: "",
          subject: "",
          category: "",
          page: 1,
          pageSize: 6,
        }),
    isLocked
      ? {
          hasData: false,
          totalCompleted: 0,
          avgScore: null,
          maxScore: null,
          totalQuestions: 0,
          totalCorrect: 0,
          correctRate: 0,
        }
      : getStudentStatistics(),
    isLocked
      ? { items: [], total: 0, page: 1, pageSize: 4, totalPages: 1 }
      : getStudentHistory({ page: 1, pageSize: 4 }),
  ]);

  const publicExams = catalog.items.filter(
    (exam) => exam.accessType === "public",
  );
  const studentOnlyExams = catalog.items.filter(
    (exam) => exam.accessType === "students_only",
  );

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Student Greeting & Header */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-[var(--card)] to-[var(--card)] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="h-3.5 w-3.5" /> Không gian học tập cá nhân
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Tổng quan học sinh
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] max-w-xl leading-relaxed">
              Chào mừng {profile?.display_name ? `bạn ${profile.display_name}` : "bạn"} trở lại 👋! Tiếp tục hành trình ôn tập, làm đề thi và theo dõi tiến độ học tập.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button asChild size="sm" className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
              <Link href="/exams" className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span>Mở thư viện đề thi</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
              <Link href="/student/history" className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span>Lịch sử thi</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {isLocked ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-700 dark:text-rose-200 space-y-2">
          <div className="flex justify-center">
            <Lock className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="font-bold">Tài khoản của bạn hiện đang bị khóa</p>
          <p className="text-xs text-rose-600 dark:text-rose-300">
            Vui lòng liên hệ ban quản trị để được hỗ trợ mở khóa và kích hoạt lại tài khoản.
          </p>
        </div>
      ) : null}

      {/* 2. Thống kê học tập (KPI Cards) */}
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader className="border-b border-[var(--divider)] pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Thống kê học tập
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {!stats.hasData ? (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Target className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-[var(--foreground)]">
                  Bạn chưa có dữ liệu học tập
                </p>
                <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                  Hãy hoàn thành bài thi đầu tiên để hệ thống phân tích và thống kê kết quả học tập của bạn.
                </p>
              </div>
              <Button asChild size="sm" className="mt-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
                <Link href="/exams">Chọn bài thi ngay</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Bài đã làm</span>
                </div>
                <p className="text-2xl font-extrabold text-[var(--foreground)]">
                  {stats.totalCompleted}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-medium">
                  <Award className="h-3.5 w-3.5" />
                  <span>Điểm trung bình</span>
                </div>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats.avgScore !== null ? stats.avgScore : "—"}
                  {stats.avgScore !== null && (
                    <span className="text-xs font-normal text-[var(--muted-foreground)]"> / 10</span>
                  )}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Quy đổi thang 10</p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-amber-600 dark:text-amber-400 mb-1 font-medium">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>Điểm cao nhất</span>
                </div>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {stats.maxScore !== null ? stats.maxScore : "—"}
                  {stats.maxScore !== null && (
                    <span className="text-xs font-normal text-[var(--muted-foreground)]"> / 10</span>
                  )}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Quy đổi thang 10</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Tổng câu đã làm</span>
                </div>
                <p className="text-2xl font-extrabold text-[var(--foreground)]">
                  {stats.totalQuestions}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">
                  <Target className="h-3.5 w-3.5" />
                  <span>Tỷ lệ đúng</span>
                </div>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {stats.correctRate}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Lịch sử gần nhất (ChoCode style row cards) */}
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader className="border-b border-[var(--divider)] pb-4 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Lịch sử gần nhất
          </CardTitle>
          {historyData.items.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="text-[var(--primary)] hover:bg-[var(--primary)]/10">
              <Link
                href="/student/history"
                className="text-xs font-semibold flex items-center gap-1"
              >
                Xem tất cả lịch sử ({historyData.total}) <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {historyData.items.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Bạn chưa làm bài thi nào
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Hãy chọn một bài thi để bắt đầu luyện tập và rèn luyện kỹ năng.
              </p>
              <Button asChild size="sm" variant="outline" className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                <Link href="/exams">Xem danh sách đề thi</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {historyData.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] gap-3 hover:border-[var(--primary)]/40 hover:bg-[var(--card-hover)] transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {item.statusLabel}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">{item.formattedDate}</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{item.examTitle}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    {item.showScoreAfterSubmit && item.score !== null ? (
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                        {item.score} / {item.maxScore} điểm
                      </span>
                    ) : (
                      <span className="text-xs italic text-[var(--muted-foreground)]">
                        Chưa công bố điểm
                      </span>
                    )}
                    <Button asChild variant="outline" size="sm" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
                      <Link href={`/attempts/${item.id}/result`}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Xem kết quả
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link
          href="/exams"
          className="group flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-md transition-all hover:border-[var(--primary)]/40 hover:shadow-blue-500/5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-colors group-hover:bg-[var(--primary)] group-hover:text-white mb-2.5">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">
            Khám phá đề thi
          </span>
        </Link>

        <Link
          href="/student/history"
          className="group flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-md transition-all hover:border-indigo-500/40 hover:shadow-indigo-500/5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-colors group-hover:bg-indigo-600 group-hover:text-white mb-2.5">
            <History className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            Lịch sử làm bài
          </span>
        </Link>

        <Link
          href="/documents"
          className="group flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-md transition-all hover:border-emerald-500/40 hover:shadow-emerald-500/5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-colors group-hover:bg-emerald-600 group-hover:text-white mb-2.5">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            Tài liệu ôn tập
          </span>
        </Link>

        <Link
          href="/profile"
          className="group flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-md transition-all hover:border-purple-500/40 hover:shadow-purple-500/5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 transition-colors group-hover:bg-purple-600 group-hover:text-white mb-2.5">
            <User className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-purple-600 dark:group-hover:text-purple-400">
            Hồ sơ cá nhân
          </span>
        </Link>
      </div>

      {/* 5. Exam Catalog Sections */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            Đề mới cập nhật
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-[var(--primary)] hover:bg-[var(--primary)]/10">
            <Link href="/exams" className="text-xs font-semibold">
              Xem tất cả →
            </Link>
          </Button>
        </div>
        {catalog.items.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {catalog.items.slice(0, 3).map((exam) => (
              <ExamCard key={exam.examId} exam={exam} />
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có đề thi phù hợp" />
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            Đề công khai
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-[var(--primary)] hover:bg-[var(--primary)]/10">
            <Link href="/exams" className="text-xs font-semibold">
              Xem tất cả →
            </Link>
          </Button>
        </div>
        {publicExams.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publicExams.map((exam) => (
              <ExamCard key={exam.examId} exam={exam} />
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có đề thi công khai phù hợp" />
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            Đề chỉ dành cho học sinh
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-[var(--primary)] hover:bg-[var(--primary)]/10">
            <Link href="/exams" className="text-xs font-semibold">
              Xem tất cả →
            </Link>
          </Button>
        </div>
        {studentOnlyExams.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {studentOnlyExams.map((exam) => (
              <ExamCard key={exam.examId} exam={exam} />
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có đề thi dành riêng cho học sinh" />
        )}
      </section>

      {/* 6. Platform Highlights Banner */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl">
        <div className="grid gap-6 sm:grid-cols-3 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Save className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Lưu bài tức thì</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Tự động đồng bộ câu trả lời</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Bảo vệ kết quả</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Chấm điểm an toàn máy chủ</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Maximize2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Môi trường tập trung</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Hạn chế tối đa phân tâm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
