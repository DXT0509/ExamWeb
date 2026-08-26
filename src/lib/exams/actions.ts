"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formBoolean, formIdList, formNullableString, formNumber, formString } from "@/lib/admin/form-data";
import { type ActionState, toFieldErrors } from "@/lib/admin/types";
import { requireRole } from "@/lib/auth/require-user";
import { getDatabaseErrorMessage, getRpcResultError } from "@/lib/exams/errors";
import { createClient } from "@/lib/supabase/server";
import {
  cloneExamSchema,
  examDraftSchema,
  optionSchema,
  postgresUuidSchema,
  questionSchema,
  reorderSchema,
  sectionSchema,
  validateQuestionImageFile,
} from "@/lib/validations/exam";

import { generateVietnameseSlug, resolveUniqueExamSlug } from "@/lib/utils/slug";

function parseExamForm(formData: FormData) {
  const rawSlug = formString(formData, "slug");
  return examDraftSchema.safeParse({
    subjectId: formString(formData, "subjectId"),
    categoryId: formNullableString(formData, "categoryId"),
    title: formString(formData, "title"),
    slug: rawSlug ? rawSlug.toLowerCase() : undefined,
    description: formNullableString(formData, "description"),
    accessType: formString(formData, "accessType"),
    allowGuestAttempt: formBoolean(formData, "allowGuestAttempt"),
    fullscreenRequired: formBoolean(formData, "fullscreenRequired"),
    durationMinutes: formNumber(formData, "durationMinutes"),
    randomizeQuestions: false,
    randomizeOptions: false,
    showScoreAfterSubmit: formBoolean(formData, "showScoreAfterSubmit"),
    showAnswersAfterSubmit: formBoolean(formData, "showAnswersAfterSubmit"),
    showSolutionsAfterSubmit: formBoolean(formData, "showSolutionsAfterSubmit"),
  });
}

export async function createExamAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/exams/new");
  const parsed = parseExamForm(formData);
  if (!parsed.success) return { ok: false, message: "Dữ liệu đề thi chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const userId = user.id;
  const supabase = await createClient();

  const slug = parsed.data.slug
    ? await resolveUniqueExamSlug(supabase, parsed.data.slug)
    : await resolveUniqueExamSlug(supabase, generateVietnameseSlug(parsed.data.title));

  const { data, error } = await supabase
    .from("exams")
    .insert({
      subject_id: parsed.data.subjectId,
      category_id: parsed.data.categoryId ?? null,
      title: parsed.data.title,
      slug,
      description: parsed.data.description ?? null,
      status: "draft",
      access_type: parsed.data.accessType,
      allow_guest_attempt: parsed.data.allowGuestAttempt,
      fullscreen_required: parsed.data.fullscreenRequired,
      duration_minutes: parsed.data.durationMinutes,
      randomize_questions: false,
      randomize_options: false,
      show_score_after_submit: parsed.data.showScoreAfterSubmit,
      show_answers_after_submit: parsed.data.showAnswersAfterSubmit,
      show_solutions_after_submit: parsed.data.showSolutionsAfterSubmit,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: getDatabaseErrorMessage(error) };

  // Tự động tạo Phần thi đầu tiên cho đề thi mới
  await supabase
    .from("exam_sections")
    .insert({
      exam_id: data.id,
      title: "Phần 1: Trắc nghiệm",
      description: "Các câu hỏi kiểm tra kiến thức.",
      position: 1,
    });

  redirect(`/admin/exams/${data.id}`);
}

export async function updateExamAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/exams");
  const parsed = parseExamForm(formData);
  if (!parsed.success) return { ok: false, message: "Dữ liệu đề thi chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const userId = user.id;
  const id = formString(formData, "id");
  const supabase = await createClient();

  let slug = parsed.data.slug;
  if (!slug) {
    // Keep existing slug or resolve from title
    const { data: existing } = await supabase.from("exams").select("slug").eq("id", id).maybeSingle();
    slug = existing?.slug ?? (await resolveUniqueExamSlug(supabase, generateVietnameseSlug(parsed.data.title), id));
  } else {
    slug = await resolveUniqueExamSlug(supabase, slug, id);
  }

  const { error } = await supabase
    .from("exams")
    .update({
      subject_id: parsed.data.subjectId,
      category_id: parsed.data.categoryId ?? null,
      title: parsed.data.title,
      slug,
      description: parsed.data.description ?? null,
      access_type: parsed.data.accessType,
      allow_guest_attempt: parsed.data.allowGuestAttempt,
      fullscreen_required: parsed.data.fullscreenRequired,
      duration_minutes: parsed.data.durationMinutes,
      randomize_questions: false,
      randomize_options: false,
      show_score_after_submit: parsed.data.showScoreAfterSubmit,
      show_answers_after_submit: parsed.data.showAnswersAfterSubmit,
      show_solutions_after_submit: parsed.data.showSolutionsAfterSubmit,
      updated_by: userId,
    })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, message: getDatabaseErrorMessage(error) };
  revalidatePath(`/admin/exams/${id}`);
  revalidatePath("/admin/exams");
  return { ok: true, message: "Đã lưu thay đổi đề thi." };
}

export async function saveSectionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const parsed = sectionSchema.safeParse({
    title: formString(formData, "title"),
    description: formNullableString(formData, "description"),
    position: formNumber(formData, "position") || 1,
  });
  if (!parsed.success) return { ok: false, message: "Dữ liệu phần thi chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createClient();
  const id = formString(formData, "sectionId");
  const examId = formString(formData, "examId");

  let positionToUse = parsed.data.position;
  if (!id) {
    const { data: maxSec } = await supabase
      .from("exam_sections")
      .select("position")
      .eq("exam_id", examId)
      .is("deleted_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    positionToUse = (maxSec?.position ?? 0) + 1;
  }

  const payload = { title: parsed.data.title, description: parsed.data.description ?? null, position: positionToUse };
  const result = id
    ? await supabase.from("exam_sections").update(payload).eq("id", id)
    : await supabase.from("exam_sections").insert({ ...payload, exam_id: examId });
  if (result.error) return { ok: false, message: getDatabaseErrorMessage(result.error) };
  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true, message: id ? "Đã lưu phần thi." : "Đã tạo phần thi." };
}

export async function saveQuestionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const rawContent = formString(formData, "content").trim();
  const contentToSave = rawContent.length > 0 ? rawContent : "Nhập câu hỏi";

  const parsed = questionSchema.safeParse({
    content: contentToSave,
    imagePath: formNullableString(formData, "imagePath"),
    explanation: formNullableString(formData, "explanation"),
    score: formNumber(formData, "score") || 1,
    position: formNumber(formData, "position") || 1,
    isActive: formBoolean(formData, "isActive"),
  });
  if (!parsed.success) return { ok: false, message: "Dữ liệu câu hỏi chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createClient();
  const id = formString(formData, "questionId");
  const sectionId = formString(formData, "sectionId");
  const examId = formString(formData, "examId");

  if (id) {
    const payload = {
      content: parsed.data.content,
      image_path: parsed.data.imagePath ?? null,
      explanation: parsed.data.explanation ?? null,
      score: parsed.data.score,
      position: parsed.data.position,
      is_active: parsed.data.isActive ?? false,
    };
    const result = await supabase.from("questions").update(payload).eq("id", id);
    if (result.error) return { ok: false, message: getDatabaseErrorMessage(result.error) };
  } else {
    const { data: maxQ } = await supabase
      .from("questions")
      .select("position")
      .eq("section_id", sectionId)
      .is("deleted_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = (maxQ?.position ?? 0) + 1;

    const payload = {
      content: parsed.data.content,
      image_path: parsed.data.imagePath ?? null,
      explanation: parsed.data.explanation ?? null,
      score: parsed.data.score,
      position: nextPosition,
      is_active: parsed.data.isActive ?? false,
    };

    const { data: newQ, error: qError } = await supabase
      .from("questions")
      .insert({ ...payload, section_id: sectionId })
      .select("id")
      .single();
    if (qError) return { ok: false, message: getDatabaseErrorMessage(qError) };

    // Tự động tạo 4 phương án mẫu A, B, C, D cho câu hỏi mới
    await supabase.from("question_options").insert([
      { question_id: newQ.id, content: "Phương án A", position: 1, is_correct: true, is_active: true },
      { question_id: newQ.id, content: "Phương án B", position: 2, is_correct: false, is_active: true },
      { question_id: newQ.id, content: "Phương án C", position: 3, is_correct: false, is_active: true },
      { question_id: newQ.id, content: "Phương án D", position: 4, is_correct: false, is_active: true },
    ]);
  }
  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true, message: id ? "Đã lưu câu hỏi." : "Đã tạo câu hỏi." };
}

export async function saveOptionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const parsed = optionSchema.safeParse({
    content: formString(formData, "content"),
    position: formNumber(formData, "position") || 1,
    isCorrect: formBoolean(formData, "isCorrect"),
    isActive: formBoolean(formData, "isActive"),
  });
  if (!parsed.success) return { ok: false, message: "Dữ liệu lựa chọn chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createClient();
  const id = formString(formData, "optionId");
  const questionId = formString(formData, "questionId");
  const examId = formString(formData, "examId");
  if (parsed.data.isCorrect) {
    const clear = await supabase.from("question_options").update({ is_correct: false }).eq("question_id", questionId).is("deleted_at", null);
    if (clear.error) return { ok: false, message: getDatabaseErrorMessage(clear.error) };
  }

  let positionToUse = parsed.data.position;
  if (!id) {
    const { data: maxOpt } = await supabase
      .from("question_options")
      .select("position")
      .eq("question_id", questionId)
      .is("deleted_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    positionToUse = (maxOpt?.position ?? 0) + 1;
  }

  const payload = {
    content: parsed.data.content,
    position: positionToUse,
    is_correct: parsed.data.isCorrect,
    is_active: parsed.data.isActive ?? false,
  };
  const result = id
    ? await supabase.from("question_options").update(payload).eq("id", id)
    : await supabase.from("question_options").insert({ ...payload, question_id: questionId });
  if (result.error) return { ok: false, message: getDatabaseErrorMessage(result.error) };
  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true, message: id ? "Đã lưu lựa chọn." : "Đã thêm lựa chọn." };
}

export async function markCorrectOptionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const parsed = {
    examId: postgresUuidSchema("Đề thi không hợp lệ.").safeParse(formString(formData, "examId")),
    questionId: postgresUuidSchema("Câu hỏi không hợp lệ.").safeParse(formString(formData, "questionId")),
    optionId: postgresUuidSchema("Lựa chọn không hợp lệ.").safeParse(formString(formData, "optionId")),
  };
  if (!parsed.examId.success || !parsed.questionId.success || !parsed.optionId.success) {
    return { ok: false, message: "Không thể chọn đáp án đúng vì dữ liệu lựa chọn chưa hợp lệ." };
  }
  const supabase = await createClient();
  const clear = await supabase
    .from("question_options")
    .update({ is_correct: false })
    .eq("question_id", parsed.questionId.data)
    .is("deleted_at", null);
  if (clear.error) return { ok: false, message: getDatabaseErrorMessage(clear.error) };

  const setCorrect = await supabase
    .from("question_options")
    .update({ is_correct: true, is_active: true })
    .eq("id", parsed.optionId.data)
    .eq("question_id", parsed.questionId.data)
    .is("deleted_at", null);
  if (setCorrect.error) return { ok: false, message: getDatabaseErrorMessage(setCorrect.error) };
  revalidatePath(`/admin/exams/${parsed.examId.data}`);
  return { ok: true, message: "Đã chọn đáp án đúng." };
}

export async function softDeleteContentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const table = formString(formData, "table");
  const id = formString(formData, "id");
  const examId = formString(formData, "examId");
  const supabase = await createClient();
  const payload = { deleted_at: new Date().toISOString(), is_active: false };
  const result =
    table === "exam_sections"
      ? await supabase.from("exam_sections").update({ deleted_at: payload.deleted_at }).eq("id", id)
      : table === "questions"
        ? await supabase.from("questions").update(payload).eq("id", id)
        : await supabase.from("question_options").update(payload).eq("id", id);
  if (result.error) return { ok: false, message: getDatabaseErrorMessage(result.error) };
  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true, message: "Đã xóa nội dung." };
}

export async function deleteExamAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const id = formString(formData, "id");
  if (!id) {
    return { ok: false, message: "Mã đề thi không hợp lệ." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_exam", { p_exam_id: id });

  if (error) {
    return { ok: false, message: getDatabaseErrorMessage(error) };
  }

  const result = data?.[0];
  const message = getRpcResultError(result);
  if (message) {
    return { ok: false, message };
  }

  revalidatePath("/admin/exams");
  revalidatePath("/exams");
  return { ok: true, message: "Đã xóa đề thi thành công." };
}

export async function transitionExamAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const examId = formString(formData, "examId");
  const action = formString(formData, "transition");
  const supabase = await createClient();
  const rpc =
    action === "publish"
      ? await supabase.rpc("publish_exam", { exam_id: examId })
      : action === "return"
        ? await supabase.rpc("return_exam_to_draft", { exam_id: examId })
        : action === "close"
          ? await supabase.rpc("close_exam", { exam_id: examId })
          : await supabase.rpc("archive_exam", { exam_id: examId });
  if (rpc.error) return { ok: false, message: getDatabaseErrorMessage(rpc.error) };
  const message = getRpcResultError(rpc.data?.[0]);
  if (message) return { ok: false, message };
  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/admin/exams");
  return { ok: true, message: action === "publish" ? "Đã xuất bản đề thi." : action === "close" ? "Đã đóng đề thi." : action === "archive" ? "Đã lưu trữ đề thi." : "Đã đưa đề về bản nháp." };
}

export async function cloneExamAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const parsed = cloneExamSchema.safeParse({
    sourceExamId: formString(formData, "sourceExamId"),
    newTitle: formString(formData, "newTitle"),
    newSlug: formString(formData, "newSlug").toLowerCase(),
  });
  if (!parsed.success) return { ok: false, message: "Dữ liệu nhân bản chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clone_exam", {
    source_exam_id: parsed.data.sourceExamId,
    new_title: parsed.data.newTitle,
    new_slug: parsed.data.newSlug,
  });
  if (error) return { ok: false, message: getDatabaseErrorMessage(error) };
  const result = data?.[0];
  const message = getRpcResultError(result);
  if (message || !result?.cloned_exam_id) return { ok: false, message: message ?? "Không thể nhân bản đề thi." };
  redirect(`/admin/exams/${result.cloned_exam_id}`);
}

export async function reorderContentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const kind = formString(formData, "kind");
  const examId = formString(formData, "examId");
  const parsed = reorderSchema.safeParse({ parentId: formString(formData, "parentId"), orderedIds: formIdList(formData, "orderedIds") });
  if (!parsed.success) return { ok: false, message: "Thứ tự mới chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createClient();
  const rpc =
    kind === "sections"
      ? await supabase.rpc("reorder_exam_sections", { target_exam_id: parsed.data.parentId, ordered_section_ids: parsed.data.orderedIds })
      : kind === "questions"
        ? await supabase.rpc("reorder_section_questions", { target_section_id: parsed.data.parentId, ordered_question_ids: parsed.data.orderedIds })
        : await supabase.rpc("reorder_question_options", { target_question_id: parsed.data.parentId, ordered_option_ids: parsed.data.orderedIds });
  if (rpc.error) return { ok: false, message: getDatabaseErrorMessage(rpc.error) };
  const message = getRpcResultError(rpc.data?.[0]);
  if (message) return { ok: false, message };
  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true, message: "Đã cập nhật thứ tự." };
}

export async function uploadQuestionImageAction(
  formData: FormData
): Promise<{ ok: boolean; message: string; url?: string }> {
  try {
    await requireRole("admin", "/admin/exams");
    const file = formData.get("file") as File | null;
    const validation = validateQuestionImageFile(file);
    if (!validation.ok) {
      return { ok: false, message: validation.error };
    }
    const validFile = file as File;

    const safeName = validFile.name
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const filename = `${crypto.randomUUID()}-${safeName}`;

    // Lưu vào thư mục public/uploads/questions/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "questions");
    await fs.mkdir(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await validFile.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

    const publicUrl = `/uploads/questions/${filename}`;
    return { ok: true, message: "Tải ảnh lên thành công.", url: publicUrl };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không thể tải hình ảnh lên.",
    };
  }
}
