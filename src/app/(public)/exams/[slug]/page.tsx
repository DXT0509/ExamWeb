import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileQuestion,
  HelpCircle,
  Lock,
  Maximize2,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StartExamButton } from "@/components/exams/start-exam-button";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getExamBySlug } from "@/lib/exams/catalog";

const accessLabels = {
  public: "Công khai",
  students_only: "Dành cho học sinh",
  private: "Riêng tư",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exam = await getExamBySlug(slug);
  if (!exam) return { title: "Đề thi không khả dụng | ExamPrep" };
  return {
    title: `${exam.title} | ExamPrep`,
    description: exam.description ?? `Chi tiết đề thi ${exam.title}`,
  };
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [exam, profile] = await Promise.all([
    getExamBySlug(slug),
    getCurrentProfile(),
  ]);

  if (!exam) {
    return (
      <section className="container-page py-12">
        <Card className="max-w-xl mx-auto text-center p-8 border-[var(--border)] bg-[var(--card)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto mb-4 border border-amber-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-[var(--foreground)]">Đề thi không khả dụng</CardTitle>
          <CardContent className="mt-2 space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Đề thi này không tồn tại hoặc hiện không khả dụng.
            </p>
            <Button asChild variant="outline" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
              <Link href="/exams">
                <ArrowLeft className="mr-2 h-4 w-4" /> Về thư viện đề thi
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const isGuest = !profile;
  const isLocked = profile?.status === "locked";
  const canStartAsGuest = isGuest && exam.allowGuestAttempt;
  const canStartAsStudent =
    profile?.role === "student" && profile.status === "active";

  return (
    <section className="space-y-10 py-6 pb-16">
      {/* Breadcrumb Header */}
      <PageHeader
        title={exam.title}
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Đề thi", href: "/exams" },
          { label: exam.title },
        ]}
        badge={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border">
              {exam.subjectName}
            </Badge>
            {exam.categoryName && (
              <Badge className="border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted-foreground)] border">
                {exam.categoryName}
              </Badge>
            )}
            <Badge
              className={
                exam.accessType === "public"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border"
                  : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border"
              }
            >
              {accessLabels[exam.accessType]}
            </Badge>
            {exam.allowGuestAttempt && (
              <Badge className="border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 border">
                Khách có thể làm
              </Badge>
            )}
            {exam.fullscreenRequired && (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 border">
                Bắt buộc toàn màn hình
              </Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Column: Overview & Specifications */}
        <div className="space-y-6">
          {exam.description && (
            <Card className="border-[var(--border)] bg-[var(--card)]">
              <CardHeader>
                <CardTitle className="text-base font-bold text-[var(--foreground)]">
                  Mô tả đề thi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                  {exam.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Key Specs */}
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[var(--foreground)]">
                Thông số bài thi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-3.5 text-center">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">Thời gian</p>
                  <p className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">
                    {exam.durationMinutes} phút
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-3.5 text-center">
                  <FileQuestion className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1.5" />
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">Số lượng câu</p>
                  <p className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">
                    {exam.questionCount} câu
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-3.5 text-center">
                  <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400 mx-auto mb-1.5" />
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">Tổng điểm</p>
                  <p className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">
                    {exam.totalScore} điểm
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-3.5 text-center">
                  <Maximize2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">Toàn màn hình</p>
                  <p className="text-sm font-bold text-[var(--foreground)] mt-1">
                    {exam.fullscreenRequired ? "Bắt buộc" : "Không"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exam Rules & Post-submit display settings */}
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[var(--foreground)]">
                Quy định & Chế độ sau nộp bài
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-[var(--divider)]">
                  <span className="text-[var(--muted-foreground)] flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-[var(--muted-foreground)]" />
                    Hiển thị điểm sau khi nộp
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {exam.showScoreAfterSubmit ? "Có" : "Không"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[var(--divider)]">
                  <span className="text-[var(--muted-foreground)] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--muted-foreground)]" />
                    Hiển thị đáp án sau khi nộp
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {exam.showAnswersAfterSubmit ? "Có" : "Không"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[var(--divider)]">
                  <span className="text-[var(--muted-foreground)] flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[var(--muted-foreground)]" />
                    Hiển thị lời giải sau khi nộp
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {exam.showSolutionsAfterSubmit ? "Có" : "Không"}
                  </span>
                </div>

                {exam.publishedAt && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[var(--muted-foreground)] flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                      Ngày xuất bản
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {new Intl.DateTimeFormat("vi-VN").format(
                        new Date(exam.publishedAt),
                      )}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Action Box */}
        <div className="space-y-6">
          <Card className="border-[var(--border)] bg-[var(--card)] shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 via-[var(--card)] to-[var(--card)] border-b border-[var(--divider)] pb-4">
              <CardTitle className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Phòng thi trực tuyến
              </CardTitle>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Chuẩn bị sẵn sàng trước khi bấm bắt đầu làm bài.
              </p>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
                <p className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                  <span>
                    Đồng hồ sẽ bắt đầu đếm ngược ngay khi phiên làm bài được khởi tạo.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                  <span>
                    Đáp án của bạn được hệ thống tự động lưu liên tục sau mỗi thao tác chọn.
                  </span>
                </p>
                {exam.fullscreenRequired && (
                  <p className="flex items-start gap-2 text-amber-700 dark:text-amber-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
                    <span>
                      Đề thi bắt buộc chế độ toàn màn hình. Rời khỏi màn hình quá 5 giây sẽ bị tự động nộp bài.
                    </span>
                  </p>
                )}
              </div>

              {isLocked && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ ban quản trị để được hỗ trợ.
                </div>
              )}

              {(canStartAsGuest || canStartAsStudent) && !isLocked ? (
                <div className="pt-2">
                  <StartExamButton
                    examId={exam.examId}
                    fullscreenRequired={exam.fullscreenRequired}
                  />
                </div>
              ) : null}

              {profile?.role === "admin" && (
                <div className="space-y-3 pt-2">
                  <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                    <span>
                      Bạn đang xem tổng quan đề thi với tư cách Quản trị viên. Tài khoản Quản trị viên không tham gia làm bài thi.
                    </span>
                  </div>
                  <Button asChild variant="outline" className="w-full border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] rounded-xl" size="lg">
                    <Link href="/admin/exams">
                      Quản lý đề thi trong Admin
                    </Link>
                  </Button>
                </div>
              )}

              {isGuest && !exam.allowGuestAttempt && (
                <div className="space-y-3 pt-2">
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <span>
                      Đề thi này yêu cầu đăng nhập tài khoản học sinh để tham gia.
                    </span>
                  </div>
                  <Button asChild className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20" size="lg">
                    <Link href={`/login?next=/exams/${exam.slug}`}>
                      Đăng nhập để làm bài
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
