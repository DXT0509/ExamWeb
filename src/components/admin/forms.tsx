"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm, ModalShell } from "@/components/admin/action-form";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/categories/actions";
import { createExamAction } from "@/lib/exams/actions";
import { deleteSubjectAction, saveSubjectAction } from "@/lib/subjects/actions";

type TaxonomyItem = { id: string; name: string; slug: string; description: string | null; is_active: boolean };
type SelectItem = { id: string; name: string };

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-24 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-focus)]"
    />
  );
}

function CheckBox({ label, name, defaultChecked = false }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]" />
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
      <label className="grid gap-1 text-sm text-[var(--foreground)]">
        {isSubject ? "Tên môn học" : "Tên danh mục"}
        <Input name="name" defaultValue={item?.name} required minLength={2} maxLength={100} />
      </label>
      <label className="grid gap-1 text-sm text-[var(--foreground)]">
        Slug
        <Input name="slug" defaultValue={item?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </label>
      <label className="grid gap-1 text-sm text-[var(--foreground)]">
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
      <ModalShell title={type === "subject" ? "Sửa môn học" : "Sửa danh mục"} trigger={<Button variant="outline" size="sm" className="rounded-xl border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Sửa</Button>}>
        <TaxonomyForm item={item} type={type} />
      </ModalShell>
      <ModalShell title={type === "subject" ? "Xóa môn học?" : "Xóa danh mục?"} trigger={<Button variant="destructive" size="sm" className="rounded-xl">Xóa</Button>}>
        <p className="mb-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
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
  const [selectedTemplate, setSelectedTemplate] = useState("thpt_math_2026");
  const [duration, setDuration] = useState(90);

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey === "thpt_math_2026") {
      setDuration(90);
    } else if (templateKey === "hsa_math_2026") {
      setDuration(75);
    } else {
      setDuration(60);
    }
  };

  return (
    <ActionForm
      action={createExamAction}
      submitLabel="Tạo đề thi & Bắt đầu soạn"
      className="grid gap-5 md:grid-cols-2"
      buttonClassName="md:col-span-2 h-11 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold"
    >
      <label className="grid gap-1.5 text-sm font-medium text-[var(--foreground)] md:col-span-2">
        Tiêu đề đề thi
        <Input name="title" placeholder="Ví dụ: Đề tham khảo tốt nghiệp THPT 2026 — Môn Toán" required minLength={2} maxLength={200} />
      </label>

      {/* Template Selector */}
      <label className="grid gap-1.5 text-sm font-medium text-[var(--foreground)] md:col-span-2">
        Cấu trúc đề / Template tạo sẵn
        <select
          name="examTemplate"
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="h-11 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] font-semibold transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        >
          <option value="thpt_math_2026">
            ✨ Toán tốt nghiệp THPT 2026 (12 trắc nghiệm + 4 Đúng/Sai + 6 trả lời ngắn — 90 phút, 10 điểm)
          </option>
          <option value="hsa_math_2026">
            ✨ Toán HSA 2026 — Phần Toán học & Xử lý số liệu (35 trắc nghiệm + 15 điền đáp án — 75 phút)
          </option>
          <option value="custom">
            📝 Tự do / Môn khác (Tự thêm câu hỏi theo nhu cầu)
          </option>
        </select>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
          {selectedTemplate === "thpt_math_2026" &&
            "Hệ thống sẽ tự động tạo sẵn toàn bộ 22 câu (12 câu trắc nghiệm nhiều lựa chọn, 4 câu chùm Đúng/Sai, 6 câu trả lời ngắn) và tự động cấu hình thang điểm 10."}
          {selectedTemplate === "hsa_math_2026" &&
            "Hệ thống sẽ tự động tạo sẵn 50 câu (35 câu trắc nghiệm 4 lựa chọn + 15 câu điền đáp án ngắn) chuẩn cấu trúc HSA ĐHQGHN."}
          {selectedTemplate === "custom" &&
            "Tạo đề rỗng để bạn tự do thêm các câu hỏi trắc nghiệm, đúng/sai, trả lời ngắn tùy ý."}
        </p>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-[var(--foreground)]">
        Môn học
        <select name="subjectId" required className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
          <option value="">-- Chọn môn học --</option>
          {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-[var(--foreground)]">
        Thời gian làm bài (phút)
        <Input
          name="durationMinutes"
          type="number"
          min={1}
          max={300}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          required
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-[var(--foreground)]">
        Danh mục kỳ thi
        <select name="categoryId" className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
          <option value="">Không phân loại danh mục</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-[var(--foreground)]">
        Quyền truy cập
        <select name="accessType" defaultValue="public" className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
          <option value="public">Công khai</option>
          <option value="students_only">Chỉ học sinh đã đăng nhập</option>
          <option value="private">Riêng tư (Chỉ Admin xem trước)</option>
        </select>
      </label>

      <div className="md:col-span-2 space-y-3 pt-2 border-t border-[var(--divider)]">
        <CheckBox label="Cho phép làm với tư cách Người dùng khách (không cần đăng nhập)" name="allowGuestAttempt" defaultChecked={true} />
        <CheckBox label="Bắt buộc toàn màn hình & phát hiện chuyển tab" name="fullscreenRequired" defaultChecked={false} />
        <CheckBox label="Hiển thị điểm số ngay sau khi nộp bài" name="showScoreAfterSubmit" defaultChecked={true} />
        <CheckBox label="Hiển thị đáp án đúng sau khi nộp bài" name="showAnswersAfterSubmit" defaultChecked={true} />
        <CheckBox label="Hiển thị lời giải chi tiết sau khi nộp bài" name="showSolutionsAfterSubmit" defaultChecked={true} />
      </div>
    </ActionForm>
  );
}
