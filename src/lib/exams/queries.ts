import { parseListParams, type SearchParamsRecord } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export const examStatusLabels = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  closed: "Đã đóng",
  archived: "Đã lưu trữ",
} as const;

export const accessTypeLabels = {
  public: "Công khai",
  students_only: "Chỉ học sinh đã đăng nhập",
  private: "Riêng tư",
} as const;

export async function listExams(searchParams: SearchParamsRecord) {
  const supabase = await createClient();
  const params = parseListParams(searchParams);
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("exams")
    .select("id,title,slug,status,access_type,duration_minutes,total_score,updated_at,subjects(name),exam_categories(name)", { count: "exact" })
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (params.q) query = query.or(`title.ilike.%${params.q}%,slug.ilike.%${params.q}%`);
  if (["draft", "published", "closed", "archived"].includes(params.status)) query = query.eq("status", params.status as Enums<"exam_status">);
  if (params.subjectId !== "all") query = query.eq("subject_id", params.subjectId);
  if (params.categoryId !== "all") query = query.eq("category_id", params.categoryId);
  if (["public", "students_only", "private"].includes(params.accessType)) query = query.eq("access_type", params.accessType as Enums<"exam_access_type">);

  const { data, count, error } = await query;
  if (error) throw error;
  return { items: data ?? [], count: count ?? 0, params };
}

export async function getExamEditorData(examId: string) {
  const supabase = await createClient();
  const { data: exam, error } = await supabase
    .from("exams")
    .select("*,subjects(id,name),exam_categories(id,name)")
    .eq("id", examId)
    .is("deleted_at", null)
    .single();
  if (error) throw error;

  const { data: sections, error: sectionsError } = await supabase
    .from("exam_sections")
    .select("*,questions(*,question_options(*))")
    .eq("exam_id", examId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("position", { ascending: true, referencedTable: "questions" })
    .order("position", { ascending: true, referencedTable: "questions.question_options" });
  if (sectionsError) throw sectionsError;
  return { exam, sections: sections ?? [] };
}
