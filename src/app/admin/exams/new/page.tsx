import { CreateExamForm } from "@/components/admin/forms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listActiveCategories } from "@/lib/categories/queries";
import { listActiveSubjects } from "@/lib/subjects/queries";

export default async function Page() {
  const [subjects, categories] = await Promise.all([listActiveSubjects(), listActiveCategories()]);
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Tạo đề thi mới"
        description="Điền các thông tin cơ bản để khởi tạo đề thi. Sau khi tạo, bạn sẽ được chuyển ngay đến Exam Builder để soạn câu hỏi."
        breadcrumbs={[
          { label: "Quản trị", href: "/admin" },
          { label: "Đề thi", href: "/admin/exams" },
          { label: "Tạo đề mới" },
        ]}
      />

      <Card className="border-[var(--border)] bg-[var(--card)] shadow-xl rounded-2xl">
        <CardHeader className="border-b border-[var(--divider)] bg-[var(--card-secondary)] pb-4">
          <CardTitle className="text-base font-bold text-[var(--foreground)]">
            Thông tin thiết lập ban đầu
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Đường dẫn (slug) sẽ được hệ thống tự động tối ưu hóa từ tiêu đề đề thi.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <CreateExamForm subjects={subjects} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
