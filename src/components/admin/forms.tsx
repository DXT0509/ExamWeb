import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm, ModalShell } from "@/components/admin/action-form";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/categories/actions";
import { createExamAction } from "@/lib/exams/actions";
import { deleteSubjectAction, saveSubjectAction } from "@/lib/subjects/actions";

type TaxonomyItem = { id: string; name: string; slug: string; description: string | null; is_active: boolean };
type SelectItem = { id: string; name: string };

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-24 rounded-md border px-3 py-2 text-sm focus-visible:outline-2" />;
}

function CheckBox({ label, name, defaultChecked = false }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

export function TaxonomyForm({ item, type }: { item?: TaxonomyItem; type: "subject" | "category" }) {
  const isSubject = type === "subject";
  const action = isSubject ? saveSubjectAction : saveCategoryAction;
  return (
    <ActionForm action={action} submitLabel={item ? "Lưu thay đổi" : isSubject ? "Tạo môn học" : "Tạo danh mục"}>
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="grid gap-1 text-sm">
        {isSubject ? "Tên môn học" : "Tên danh mục"}
        <Input name="name" defaultValue={item?.name} required minLength={2} maxLength={100} />
      </label>
      <label className="grid gap-1 text-sm">
        Slug
        <Input name="slug" defaultValue={item?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </label>
      <label className="grid gap-1 text-sm">
        Mô tả
        <TextArea name="description" defaultValue={item?.description ?? ""} />
      </label>
      <CheckBox label="Đang hoạt động" name="isActive" defaultChecked={item?.is_active ?? true} />
    </ActionForm>
  );
}

export function TaxonomyActions({ item, type }: { item: TaxonomyItem; type: "subject" | "category" }) {
  const deleteAction = type === "subject" ? deleteSubjectAction : deleteCategoryAction;
  return (
    <div className="flex flex-wrap gap-2">
      <ModalShell title={type === "subject" ? "Sửa môn học" : "Sửa danh mục"} trigger={<Button variant="outline" size="sm">Sửa</Button>}>
        <TaxonomyForm item={item} type={type} />
      </ModalShell>
      <ModalShell title={type === "subject" ? "Xóa môn học?" : "Xóa danh mục?"} trigger={<Button variant="destructive" size="sm">Xóa</Button>}>
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">
          {type === "subject"
            ? "Môn học sẽ không còn xuất hiện trong danh sách hoạt động. Hành động này không xóa vĩnh viễn dữ liệu."
            : "Danh mục sẽ không còn xuất hiện trong danh sách hoạt động. Hành động này không xóa vĩnh viễn dữ liệu."}
        </p>
        <ActionForm action={deleteAction} submitLabel="Xác nhận xóa" pendingLabel="Đang xóa...">
          <input type="hidden" name="id" value={item.id} />
        </ActionForm>
      </ModalShell>
    </div>
  );
}

export function CreateExamForm({ subjects, categories }: { subjects: SelectItem[]; categories: SelectItem[] }) {
  return (
    <ActionForm action={createExamAction} submitLabel="Tạo đề mới" className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm md:col-span-2">Tiêu đề<Input name="title" required minLength={2} maxLength={200} /></label>
      <label className="grid gap-1 text-sm">Slug<Input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
      <label className="grid gap-1 text-sm">Thời gian làm bài<Input name="durationMinutes" type="number" min={1} max={300} defaultValue={60} required /></label>
      <label className="grid gap-1 text-sm">
        Môn học
        <select name="subjectId" required className="h-10 rounded-md border px-3 text-sm">
          <option value="">Chọn môn học</option>
          {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Danh mục kỳ thi
        <select name="categoryId" className="h-10 rounded-md border px-3 text-sm">
          <option value="">Không chọn</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Quyền truy cập
        <select name="accessType" defaultValue="public" className="h-10 rounded-md border px-3 text-sm">
          <option value="public">Công khai</option>
          <option value="students_only">Chỉ học sinh đã đăng nhập</option>
          <option value="private">Riêng tư</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">Mô tả<TextArea name="description" /></label>
      <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
        <CheckBox label="Cho phép Guest làm bài" name="allowGuestAttempt" />
        <CheckBox label="Bắt buộc toàn màn hình" name="fullscreenRequired" defaultChecked />
        <CheckBox label="Hiện điểm sau khi nộp" name="showScoreAfterSubmit" defaultChecked />
        <CheckBox label="Hiện đáp án sau khi nộp" name="showAnswersAfterSubmit" />
        <CheckBox label="Hiện lời giải sau khi nộp" name="showSolutionsAfterSubmit" />
      </div>
    </ActionForm>
  );
}
