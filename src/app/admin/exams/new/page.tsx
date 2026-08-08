import { CreateExamForm } from "@/components/admin/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listActiveCategories } from "@/lib/categories/queries";
import { listActiveSubjects } from "@/lib/subjects/queries";

export default async function Page() {
  const [subjects, categories] = await Promise.all([listActiveSubjects(), listActiveCategories()]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo đề mới</CardTitle>
      </CardHeader>
      <CardContent>
        <CreateExamForm subjects={subjects} categories={categories} />
      </CardContent>
    </Card>
  );
}
