import { ExamBuilder } from "@/components/admin/exam-builder/exam-builder";
import type { SectionData } from "@/components/admin/exam-builder/builder-section-item";
import type { ExamMetaData } from "@/components/admin/exam-builder/meta-settings-modal";
import { listActiveCategories } from "@/lib/categories/queries";
import { getExamEditorData } from "@/lib/exams/queries";
import { listActiveSubjects } from "@/lib/subjects/queries";

export default async function Page({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const [{ exam, sections }, subjects, categories] = await Promise.all([
    getExamEditorData(examId),
    listActiveSubjects(),
    listActiveCategories(),
  ]);
  return (
    <ExamBuilder
      exam={exam as unknown as ExamMetaData & { subjects?: { id: string; name: string } | null; exam_categories?: { id: string; name: string } | null }}
      sections={sections as unknown as SectionData[]}
      subjects={subjects}
      categories={categories}
    />
  );
}
