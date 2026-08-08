import type { Metadata } from "next";
import { ExamCard } from "@/components/exams/exam-card";
import { ExamFilterBar } from "@/components/exams/exam-filter-bar";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/ui/pagination";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getActiveCategories, getActiveSubjects, getPublicExams, getStudentAvailableExams, parseExamCatalogParams } from "@/lib/exams/catalog";

export const metadata: Metadata = {
  title: "Danh sách đề thi | ExamPrep",
};

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const rawParams = await searchParams;
  const params = parseExamCatalogParams(rawParams);
  const searchParamsForLinks = Object.fromEntries(
    Object.entries(rawParams).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
  );

  const profile = await getCurrentProfile();
  const canSeeStudentOnly = profile?.role === "student" && profile.status === "active";
  const result = await Promise.all([
    canSeeStudentOnly ? getStudentAvailableExams(params) : getPublicExams(params),
    getActiveSubjects(),
    getActiveCategories(),
  ])
    .then(([catalog, subjects, categories]) => ({ catalog, subjects, categories }))
    .catch(() => null);

  if (!result) {
    return (
      <section className="container-page space-y-6 py-8">
        <h1 className="text-2xl font-semibold">Thư viện đề thi</h1>
        <ErrorState />
      </section>
    );
  }

  const { catalog, subjects, categories } = result;

  return (
    <section className="container-page space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Thư viện đề thi</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Tìm kiếm đề thi đã xuất bản theo môn học và danh mục.</p>
        </div>
        <ExamFilterBar params={params} subjects={subjects} categories={categories} />
        {catalog.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">{catalog.items.map((exam) => <ExamCard key={exam.examId} exam={exam} />)}</div>
        ) : (
          <EmptyState title="Không tìm thấy đề thi phù hợp." />
        )}
        <Pagination page={catalog.page} totalPages={catalog.totalPages} searchParams={searchParamsForLinks} />
      </section>
  );
}
