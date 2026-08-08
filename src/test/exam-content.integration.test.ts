import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    const key = match?.[1];
    const value = match?.[2];
    if (key && value !== undefined && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function client(key = anonKey) {
  return createClient<Database>(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `test-${crypto.randomUUID()}` },
  });
}

async function signedIn(email: string, password: string) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return supabase;
}

describe("exam content schema, RLS and RPC", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  it("enforces catalog access by role", async () => {
    const guest = client();
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");

    const { data: guestExams, error: guestError } = await guest.from("exams").select("slug, access_type, status");
    expect(guestError).toBeNull();
    expect(guestExams).toContainEqual({ slug: "de-cong-khai-nen-tang-so", access_type: "public", status: "published" });
    expect(guestExams).not.toContainEqual({ slug: "de-danh-cho-hoc-vien-doc-hieu", access_type: "students_only", status: "published" });
    expect(guestExams?.some((exam) => exam.slug === "de-rieng-cua-quan-tri-vien")).toBe(false);
    expect(guestExams?.some((exam) => exam.status !== "published")).toBe(false);

    const { data: studentExams, error: studentError } = await student.from("exams").select("slug, access_type, status").order("slug");
    expect(studentError).toBeNull();
    expect(studentExams).toContainEqual({ slug: "de-cong-khai-nen-tang-so", access_type: "public", status: "published" });
    expect(studentExams).toContainEqual({ slug: "de-danh-cho-hoc-vien-doc-hieu", access_type: "students_only", status: "published" });
    expect(studentExams?.some((exam) => exam.access_type === "private")).toBe(false);

    const { data: adminExams, error: adminError } = await admin.from("exams").select("slug");
    expect(adminError).toBeNull();
    expect(adminExams?.length).toBeGreaterThanOrEqual(4);
  });

  it("exposes safe public exam catalog metadata by role", async () => {
    const guest = client();
    const student = await signedIn("student1@example.test", "LocalStudent123!");

    const { data: guestCatalog, error: guestError } = await guest
      .from("public_exam_catalog")
      .select("*")
      .order("slug");
    expect(guestError).toBeNull();
    expect(guestCatalog?.map((exam) => exam.slug)).toContain("de-cong-khai-nen-tang-so");
    expect(guestCatalog?.map((exam) => exam.slug)).not.toContain("de-danh-cho-hoc-vien-doc-hieu");
    expect(guestCatalog?.some((exam) => exam.access_type !== "public")).toBe(false);
    expect(JSON.stringify(guestCatalog)).not.toContain("is_correct");
    expect(JSON.stringify(guestCatalog)).not.toContain("explanation");

    const { data: studentCatalog, error: studentError } = await student
      .from("public_exam_catalog")
      .select("slug,access_type,question_count,total_score")
      .order("slug");
    expect(studentError).toBeNull();
    expect(studentCatalog).toContainEqual({ slug: "de-cong-khai-nen-tang-so", access_type: "public", question_count: 10, total_score: 10 });
    expect(studentCatalog).toContainEqual({ slug: "de-danh-cho-hoc-vien-doc-hieu", access_type: "students_only", question_count: 10, total_score: 10 });
    expect(studentCatalog?.some((exam) => exam.access_type === "private")).toBe(false);
  });

  it("blocks Student and Guest from base question and option tables", async () => {
    const guest = client();
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");

    const { data: guestQuestionMetadata, error: guestQuestionMetadataError } = await guest.from("questions").select("id");
    expect(guestQuestionMetadataError).toBeNull();
    expect(guestQuestionMetadata?.length).toBeGreaterThan(0);

    const { data: guestQuestions, error: guestQuestionError } = await guest.from("questions").select("content,explanation");
    expect(guestQuestionError).not.toBeNull();
    expect(guestQuestions).toBeNull();

    const { data: studentOptions, error: studentOptionError } = await student.from("question_options").select("id,is_correct");
    expect(studentOptionError).toBeNull();
    expect(studentOptions).toEqual([]);

    const { data: adminOptions, error: adminOptionError } = await admin.from("question_options").select("id,is_correct").limit(1);
    expect(adminOptionError).toBeNull();
    expect(adminOptions?.[0]?.is_correct).toEqual(expect.any(Boolean));
  });

  it("publishes valid drafts, computes total score and locks published content", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const service = client(serviceRoleKey);
    const suffix = crypto.randomUUID().slice(0, 8);

    const { data: exam, error: examError } = await service
      .from("exams")
      .insert({
        subject_id: "20000000-0000-0000-0000-000000000001",
        category_id: "30000000-0000-0000-0000-000000000001",
        title: `Đề kiểm thử publish ${suffix}`,
        slug: `de-kiem-thu-publish-${suffix}`,
        access_type: "public",
        duration_minutes: 30,
        created_by: "10000000-0000-0000-0000-000000000001",
        updated_by: "10000000-0000-0000-0000-000000000001",
      })
      .select("id")
      .single();
    expect(examError).toBeNull();

    const { data: emptyPublish } = await admin.rpc("publish_exam", { exam_id: exam!.id }).single();
    expect(emptyPublish?.success).toBe(false);
    expect(emptyPublish?.code).toBe("EXAM_HAS_NO_SECTION");

    const { data: section } = await service
      .from("exam_sections")
      .insert({ exam_id: exam!.id, title: "Phần kiểm thử", position: 1 })
      .select("id")
      .single();
    const { data: question } = await service
      .from("questions")
      .insert({ section_id: section!.id, content: "Câu hỏi kiểm thử có một đáp án đúng.", score: 2, position: 1 })
      .select("id")
      .single();
    await service.from("question_options").insert([
      { question_id: question!.id, content: "Đáp án sai thứ nhất.", position: 1, is_correct: false },
      { question_id: question!.id, content: "Đáp án đúng.", position: 2, is_correct: true },
    ]);

    const { data: publishResult, error: publishError } = await admin.rpc("publish_exam", { exam_id: exam!.id }).single();
    expect(publishError).toBeNull();
    expect(publishResult?.success).toBe(true);

    const { data: publishedExam } = await service.from("exams").select("status,total_score").eq("id", exam!.id).single();
    expect(publishedExam).toMatchObject({ status: "published", total_score: 2 });

    const { error: lockedError } = await admin.from("questions").update({ score: 3 }).eq("id", question!.id);
    expect(lockedError?.message).toContain("EXAM_CONTENT_LOCKED");
  });

  it("clones an exam with new content ids and rejects duplicate clone slug", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const service = client(serviceRoleKey);
    const sourceExamId = "40000000-0000-0000-0000-000000000002";
    const slug = `ban-sao-${crypto.randomUUID().slice(0, 8)}`;

    const { data: cloneResult, error: cloneError } = await admin
      .rpc("clone_exam", { source_exam_id: sourceExamId, new_title: "Bản sao đề kiểm thử", new_slug: slug })
      .single();
    expect(cloneError).toBeNull();
    expect(cloneResult?.success).toBe(true);

    const { count: clonedSections } = await service
      .from("exam_sections")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", cloneResult!.cloned_exam_id!);
    const { count: sourceSections } = await service
      .from("exam_sections")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", sourceExamId);
    expect(clonedSections).toBe(sourceSections);

    const { data: duplicateResult } = await admin
      .rpc("clone_exam", { source_exam_id: sourceExamId, new_title: "Bản sao trùng slug", new_slug: slug })
      .single();
    expect(duplicateResult?.success).toBe(false);
    expect(duplicateResult?.code).toBe("CLONE_SLUG_NOT_UNIQUE");
  });
});
