"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formBoolean, formIdList, formNullableString, formNumber, formString } from "@/lib/admin/form-data";
import { type ActionState, toFieldErrors } from "@/lib/admin/types";
import { requireRole } from "@/lib/auth/require-user";
import { getDatabaseErrorMessage, getRpcResultError } from "@/lib/exams/errors";
import { createClient } from "@/lib/supabase/server";
import { cloneExamSchema, examDraftSchema, optionSchema, postgresUuidSchema, questionSchema, reorderSchema, sectionSchema } from "@/lib/validations/exam";

function parseExamForm(formData: FormData) {
  return examDraftSchema.safeParse({
    subjectId: formString(formData, "subjectId"),
    categoryId: formNullableString(formData, "categoryId"),
    title: formString(formData, "title"),
    slug: formString(formData, "slug").toLowerCase(),
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
  const { data, error } = await supabase
    .from("exams")
    .insert({
      subject_id: parsed.data.subjectId,
      category_id: parsed.data.categoryId ?? null,
      title: parsed.data.title,
      slug: parsed.data.slug,
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
  redirect(`/admin/exams/${data.id}`);
}

export async function updateExamAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/exams");
  const parsed = parseExamForm(formData);
  if (!parsed.success) return { ok: false, message: "Dữ liệu đề thi chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const userId = user.id;
  const id = formString(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("exams")
    .update({
      subject_id: parsed.data.subjectId,
      category_id: parsed.data.categoryId ?? null,
      title: parsed.data.title,
      slug: parsed.data.slug,
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
    position: formNumber(formData, "position"),
  });
  if (!parsed.success) return { ok: false, message: "Dữ liệu phần thi chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createClient();
  const id = formString(formData, "sectionId");
  const examId = formString(formData, "examId");
  const payload = { title: parsed.data.title, description: parsed.data.description ?? null, position: parsed.data.position };
  const result = id
    ? await supabase.from("exam_sections").update(payload).eq("id", id)
    : await supabase.from("exam_sections").insert({ ...payload, exam_id: examId });
  if (result.error) return { ok: false, message: getDatabaseErrorMessage(result.error) };
  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true, message: id ? "Đã lưu phần thi." : "Đã tạo phần thi." };
}

export async function saveQuestionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const parsed = questionSchema.safeParse({
    content: formString(formData, "content"),
    imagePath: formNullableString(formData, "imagePath"),
    explanation: formNullableString(formData, "explanation"),
    score: formNumber(formData, "score"),
    position: formNumber(formData, "position"),
    isActive: formBoolean(formData, "isActive"),
  });
  if (!parsed.success) return { ok: false, message: "Dữ liệu câu hỏi chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createClient();
  const id = formString(formData, "questionId");
  const sectionId = formString(formData, "sectionId");
  const examId = formString(formData, "examId");
  const payload = {
    content: parsed.data.content,
    image_path: parsed.data.imagePath ?? null,
    explanation: parsed.data.explanation ?? null,
    score: parsed.data.score,
    position: parsed.data.position,
    is_active: parsed.data.isActive ?? false,
  };
  const result = id
    ? await supabase.from("questions").update(payload).eq("id", id)
    : await supabase.from("questions").insert({ ...payload, section_id: sectionId });
  if (result.error) return { ok: false, message: getDatabaseErrorMessage(result.error) };
  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true, message: id ? "Đã lưu câu hỏi." : "Đã tạo câu hỏi." };
}

export async function saveOptionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin", "/admin/exams");
  const parsed = optionSchema.safeParse({
    content: formString(formData, "content"),
    position: formNumber(formData, "position"),
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
  const payload = {
    content: parsed.data.content,
    position: parsed.data.position,
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
  return { ok: true, message: "Đã xóa mềm nội dung." };
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
