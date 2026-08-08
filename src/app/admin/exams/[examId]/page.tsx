import { ExamEditor } from "@/components/admin/exam-editor";
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
  return <ExamEditor exam={exam} sections={sections} subjects={subjects} categories={categories} />;
}
