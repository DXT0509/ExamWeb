import type { Metadata } from "next";
import { ExamCard } from "@/components/exams/exam-card";
import { ExamFilterBar } from "@/components/exams/exam-filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/ui/pagination";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import {
  getActiveCategories,
  getActiveSubjects,
  getPublicExams,
  getStudentAvailableExams,
  parseExamCatalogParams,
} from "@/lib/exams/catalog";

export const metadata: Metadata = {
  title: "Thư viện đề thi | ExamPrep",
  description: "Khám phá danh sách đề thi trắc nghiệm trực tuyến phong phú theo từng môn học và danh mục.",
};

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseExamCatalogParams(rawParams);
  const searchParamsForLinks = Object.fromEntries(
    Object.entries(rawParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );

  const profile = await getCurrentProfile();
  const canSeeStudentOnly =
    profile?.role === "student" && profile.status === "active";
  const result = await Promise.all([
    canSeeStudentOnly
      ? getStudentAvailableExams(params)
      : getPublicExams(params),
    getActiveSubjects(),
    getActiveCategories(),
  ])
    .then(([catalog, subjects, categories]) => ({
      catalog,
      subjects,
      categories,
    }))
    .catch(() => null);

  if (!result) {
    return (
      <section className="space-y-8 pb-12">
        <PageHeader
          title="Thư viện đề thi"
          description="Tìm kiếm và làm các đề thi đã xuất bản theo môn học và danh mục."
          breadcrumbs={[
            { label: "Trang chủ", href: "/" },
            { label: "Đề thi" },
          ]}
        />
        <ErrorState />
      </section>
    );
  }

  const { catalog, subjects, categories } = result;

  return (
    <section className="space-y-8 pb-12">
      <PageHeader
        title="Thư viện đề thi"
        description="Khám phá và tham gia làm bài thi thử nghiệm từ các môn học và danh mục chính thống."
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Đề thi" },
        ]}
      />

      <ExamFilterBar
        params={params}
        subjects={subjects}
        categories={categories}
      />

      {catalog.items.length > 0 ? (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {catalog.items.map((exam) => (
              <ExamCard key={exam.examId} exam={exam} />
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-4 pt-4 border-t border-[var(--divider)] sm:flex-row">
            <p className="text-xs text-[var(--muted-foreground)]">
              Hiển thị {catalog.items.length} / {catalog.count} đề thi phù hợp
            </p>
            <Pagination
              page={catalog.page}
              totalPages={catalog.totalPages}
              searchParams={searchParamsForLinks}
            />
          </div>
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy đề thi phù hợp"
          description="Hãy thử thay đổi từ khóa hoặc điều chỉnh bộ lọc môn học / danh mục."
          action={{
            label: "Xóa bộ lọc",
            href: "/exams",
          }}
        />
      )}
    </section>
  );
}
