import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CatalogFilterOption, ExamCatalogItem, ExamCatalogParams, PaginatedExamCatalog } from "@/lib/exams/catalog-types";
import type { Database } from "@/types/database";

type CatalogRow = Database["public"]["Views"]["public_exam_catalog"]["Row"];

const catalogParamsSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  subject: z.string().trim().regex(/^[a-z0-9-]+$/).catch(""),
  category: z.string().trim().regex(/^[a-z0-9-]+$/).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(24).catch(12),
});

export function parseExamCatalogParams(searchParams: Record<string, string | string[] | undefined>): ExamCatalogParams {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return catalogParamsSchema.parse({
    q: first(searchParams.q),
    subject: first(searchParams.subject),
    category: first(searchParams.category),
    page: first(searchParams.page),
    pageSize: first(searchParams.pageSize),
  });
}

function mapCatalogRow(row: CatalogRow): ExamCatalogItem {
  const raw = row as unknown as Record<string, unknown>;
  const examId = String(raw.exam_id || raw.id || "");
  return {
    examId,
    slug: row.slug ?? "",
    title: row.title ?? "",
    description: row.description,
    subjectId: row.subject_id ?? "",
    subjectName: row.subject_name ?? "",
    subjectSlug: row.subject_slug ?? "",
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    durationMinutes: row.duration_minutes ?? 0,
    totalScore: row.total_score ?? 0,
    questionCount: row.question_count ?? 0,
    allowGuestAttempt: row.allow_guest_attempt ?? false,
    fullscreenRequired: row.fullscreen_required ?? false,
    showScoreAfterSubmit: row.show_score_after_submit ?? false,
    showAnswersAfterSubmit: row.show_answers_after_submit ?? false,
    showSolutionsAfterSubmit: row.show_solutions_after_submit ?? false,
    accessType: row.access_type ?? "private",
    publishedAt: row.published_at,
  };
}

async function listCatalog(params: ExamCatalogParams, includeStudentsOnly: boolean): Promise<PaginatedExamCatalog> {
  const supabase = await createClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("public_exam_catalog")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  query = includeStudentsOnly ? query.in("access_type", ["public", "students_only"]) : query.eq("access_type", "public");
  const safeSearch = params.q.replace(/[%,()]/g, " ").trim();
  if (safeSearch) query = query.or(`title.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%`);
  if (params.subject) query = query.eq("subject_slug", params.subject);
  if (params.category) query = query.eq("category_slug", params.category);

  const { data, count, error } = await query;
  if (error) {
    console.error("Không thể tải danh sách đề thi.", error);
    throw new Error("CATALOG_LOAD_FAILED");
  }
  const total = count ?? 0;
  return {
    items: (data ?? []).map(mapCatalogRow),
    count: total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getPublicExams(params: ExamCatalogParams) {
  return listCatalog(params, false);
}

export async function getStudentAvailableExams(params: ExamCatalogParams) {
  return listCatalog(params, true);
}

export async function getFeaturedExams(limit = 6) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_exam_catalog")
    .select("*")
    .eq("access_type", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error("Không thể tải đề thi nổi bật.", error);
    return [];
  }
  return (data ?? []).map(mapCatalogRow);
}

export async function getExamBySlug(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_exam_catalog")
    .select("*")
    .eq("slug", slug)
    .in("access_type", ["public", "students_only"])
    .maybeSingle();
  if (error) {
    console.error("Không thể tải chi tiết đề thi.", error);
    return null;
  }
  return data ? mapCatalogRow(data) : null;
}

export async function getActiveSubjects(): Promise<CatalogFilterOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id,name,slug")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) {
    console.error("Không thể tải danh sách môn học.", error);
    return [];
  }
  return data ?? [];
}

export async function getActiveCategories(): Promise<CatalogFilterOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_categories")
    .select("id,name,slug")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) {
    console.error("Không thể tải danh sách danh mục.", error);
    return [];
  }
  return data ?? [];
}
