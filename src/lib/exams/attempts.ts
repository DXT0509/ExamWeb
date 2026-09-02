"use server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createClient } from "@/lib/supabase/server";
import { ensureGuestSessionToken, getGuestSessionHash } from "@/lib/exams/guest-session";
import { evaluateMathAnswer } from "@/lib/exams/math-parser";
import { saveAnswerSchema, startAttemptSchema, submitAttemptSchema } from "@/lib/validations/attempt";
import type { Json } from "@/types/database";

export type StudentExamOption = {
  id: string;
  content: string;
  position: number;
  is_correct?: boolean | null;
};

export type StudentExamQuestion = {
  id: string;
  content: string;
  image_path: string | null;
  score: number;
  position: number;
  question_type: string;
  tolerance?: number | null;
  options: StudentExamOption[];
};

export type StudentExamSection = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  questions: StudentExamQuestion[];
};

export type StudentAttemptAnswer = {
  question_id: string;
  selected_option_id?: string | null;
  text_answer?: string | null;
  sub_answers?: Record<string, boolean> | null;
  is_marked: boolean;
  answered_at: string;
};

export type StudentAttemptPayload = {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  exam_description: string | null;
  duration_minutes: number;
  total_score: number;
  fullscreen_required: boolean;
  exam_template?: string;
  scoring_strategy?: string;
  status: "in_progress" | "submitted" | "auto_submitted" | "expired";
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  server_now: string;
  sections: StudentExamSection[];
  answers: StudentAttemptAnswer[];
};

export type QuestionResultDetail = {
  question_id: string;
  content: string;
  image_path: string | null;
  explanation: string | null;
  score: number;
  position: number;
  question_type: string;
  correct_answer_raw?: string | null;
  tolerance?: number | null;
  selected_option_id: string | null;
  text_answer?: string | null;
  sub_answers?: Record<string, boolean> | null;
  correct_option_id: string | null;
  is_correct?: boolean | null;
  options: StudentExamOption[];
};

export type StudentAttemptResult = {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  is_guest?: boolean;
  status: "in_progress" | "submitted" | "auto_submitted" | "expired";
  submit_reason: "student_submit" | "time_expired" | "fullscreen_violation" | "account_locked" | "system_recovery" | null;
  started_at: string;
  submitted_at: string;
  duration_minutes: number;
  show_score_after_submit: boolean;
  show_answers_after_submit: boolean;
  show_solutions_after_submit: boolean;
  score: number | null;
  max_score: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  blank_answers: number | null;
  questions_detail: QuestionResultDetail[] | null;
};

function mapErrorMessage(errorCode: string | undefined, defaultMessage: string): string {
  switch (errorCode) {
    case "STUDENT_ACCOUNT_LOCKED_OR_INVALID":
      return "Tài khoản của bạn đã bị khóa hoặc không có quyền thực hiện.";
    case "EXAM_NOT_FOUND":
      return "Đề thi không tồn tại hoặc đã bị xóa.";
    case "EXAM_NOT_PUBLISHED":
      return "Đề thi chưa được xuất bản hoặc hiện không khả dụng.";
    case "LOGIN_REQUIRED":
      return "Bài thi này chỉ dành cho học viên đã đăng nhập. Vui lòng đăng nhập để bắt đầu.";
    case "GUEST_ATTEMPT_NOT_ALLOWED":
      return "Đề thi này không cho phép người dùng khách làm bài. Vui lòng đăng nhập.";
    case "INVALID_GUEST_TOKEN":
      return "Phiên làm bài người dùng khách không hợp lệ.";
    case "ATTEMPT_NOT_FOUND":
      return "Bài thi không tồn tại hoặc bạn không có quyền truy cập.";
    case "FORBIDDEN_ATTEMPT_ACCESS":
      return "Bạn không có quyền truy cập vào bài thi này.";
    case "ATTEMPT_ALREADY_FINALIZED":
      return "Bài thi đã được nộp trước đó.";
    case "ATTEMPT_EXPIRED":
      return "Thời gian làm bài thi đã hết.";
    case "INVALID_QUESTION_FOR_EXAM":
      return "Câu hỏi không thuộc đề thi này.";
    case "INVALID_OPTION_FOR_QUESTION":
      return "Đáp án đã chọn không hợp lệ.";
    case "ATTEMPT_STILL_IN_PROGRESS":
      return "Bài thi vẫn đang trong quá trình làm.";
    case "VIOLATION_GRACE_PERIOD_ACTIVE":
      return "Thời gian chờ nộp bài do vi phạm chưa đủ quy định (5 giây).";
    case "NO_ACTIVE_VIOLATION_EVENT":
      return "Không tìm thấy sự kiện vi phạm toàn màn hình.";
    case "FULLSCREEN_NOT_REQUIRED":
      return "Đề thi này không bắt buộc chế độ toàn màn hình.";
    default:
      return defaultMessage;
  }
}

/**
 * Starts a new exam attempt or retrieves an existing active attempt, then redirects to the attempt page.
 */
export async function startAttemptAction(rawExamId: string): Promise<
  | { success: true; attemptId: string; isExisting: boolean; deadlineAt: string }
  | { success: false; error: string }
> {
  try {
    const parse = startAttemptSchema.safeParse({ examId: rawExamId });
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message || "Đề thi không hợp lệ." };
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    let guestHash: string | undefined = undefined;
    if (!authData?.user) {
      try {
        const { hash } = await ensureGuestSessionToken();
        guestHash = hash;
      } catch {
        guestHash = (await getGuestSessionHash()) ?? undefined;
      }
    }

    const { data, error } = await supabase.rpc("start_attempt", {
      p_exam_id: parse.data.examId,
      p_guest_session_hash: guestHash,
    });

    if (error) {
      return { success: false, error: mapErrorMessage(error.message, "Không thể bắt đầu bài thi. Vui lòng thử lại.") };
    }

    const firstRow = Array.isArray(data) ? data[0] : data;
    if (!firstRow || !firstRow.attempt_id) {
      return { success: false, error: "Không thể tạo lượt làm bài." };
    }

    return {
      success: true,
      attemptId: firstRow.attempt_id,
      isExisting: Boolean(firstRow.is_existing),
      deadlineAt: firstRow.deadline_at,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
    return { success: false, error: mapErrorMessage(msg, "Không thể bắt đầu bài thi. Vui lòng thử lại.") };
  }
}

/**
 * Fetches the student payload for an ongoing exam attempt.
 */
export async function getAttemptPayloadAction(attemptId: string): Promise<
  | { success: true; payload: StudentAttemptPayload }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const guestHash = await getGuestSessionHash();

    const { data, error } = await supabase.rpc("get_attempt_payload", {
      p_attempt_id: attemptId,
      p_guest_session_hash: guestHash ?? undefined,
    });

    if (error) {
      return { success: false, error: mapErrorMessage(error.message, "Không thể tải bài thi. Vui lòng thử lại.") };
    }

    const payload = data as unknown as StudentAttemptPayload;

    // Robust enrichment: If any question is missing tolerance, enrich from questions table
    if (payload.sections && payload.sections.length > 0) {
      const qIds = payload.sections.flatMap((s) => (s.questions || []).map((q) => q.id));
      if (qIds.length > 0) {
        const { data: dbQuestions } = await supabase
          .from("questions")
          .select("id, tolerance")
          .in("id", qIds);

        if (dbQuestions && dbQuestions.length > 0) {
          const tolMap = new Map(dbQuestions.map((q) => [q.id, q.tolerance]));
          payload.sections = payload.sections.map((s) => ({
            ...s,
            questions: (s.questions || []).map((q) => ({
              ...q,
              tolerance: q.tolerance !== undefined && q.tolerance !== null ? q.tolerance : (tolMap.get(q.id) ?? 0),
            })),
          }));
        }
      }
    }

    return {
      success: true,
      payload,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải bài thi.";
    return { success: false, error: mapErrorMessage(msg, "Không thể tải bài thi. Vui lòng thử lại.") };
  }
}

/**
 * Autosaves an answer for a specific question in an ongoing attempt.
 */
export async function saveAnswerAction(input: {
  attemptId: string;
  questionId: string;
  selectedOptionId?: string | null;
  textAnswer?: string | null;
  subAnswers?: Record<string, boolean> | null;
  isMarked?: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const parse = saveAnswerSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message || "Dữ liệu đáp án không hợp lệ." };
    }

    const supabase = await createClient();
    const guestHash = await getGuestSessionHash();

    const { data, error } = await supabase.rpc("save_answer", {
      p_attempt_id: parse.data.attemptId,
      p_question_id: parse.data.questionId,
      p_selected_option_id: parse.data.selectedOptionId ?? undefined,
      p_is_marked: parse.data.isMarked ?? false,
      p_guest_session_hash: guestHash ?? undefined,
      p_text_answer: parse.data.textAnswer ?? undefined,
      p_sub_answers: (parse.data.subAnswers as unknown as Json) ?? undefined,
    });

    if (error) {
      return { success: false, error: mapErrorMessage(error.message, "Không thể lưu đáp án.") };
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      return { success: false, error: mapErrorMessage(result?.code, "Không thể lưu đáp án.") };
    }

    return { success: true };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu đáp án.";
    return { success: false, error: mapErrorMessage(msg, "Không thể lưu đáp án.") };
  }
}

/**
 * Submits an attempt manually or on time expiry.
 */
export async function submitAttemptAction(input: {
  attemptId: string;
  idempotencyKey?: string;
  submitReason?: "student_submit" | "time_expired" | "fullscreen_violation" | "account_locked" | "system_recovery";
}): Promise<
  | {
      success: true;
      status: string;
      score: number | null;
      maxScore: number | null;
      correctAnswers: number | null;
      wrongAnswers: number | null;
      blankAnswers: number | null;
    }
  | { success: false; error: string }
> {
  try {
    const parse = submitAttemptSchema.safeParse(input);
    if (!parse.success) {
      return { success: false, error: parse.error.issues[0]?.message || "Thông tin nộp bài không hợp lệ." };
    }

    const supabase = await createClient();
    const guestHash = await getGuestSessionHash();

    const { data, error } = await supabase.rpc("submit_attempt", {
      p_attempt_id: parse.data.attemptId,
      p_guest_session_hash: guestHash ?? undefined,
      p_idempotency_key: parse.data.idempotencyKey ?? undefined,
      p_submit_reason: input.submitReason ?? "student_submit",
    });

    if (error) {
      return { success: false, error: mapErrorMessage(error.message, "Không thể nộp bài thi. Vui lòng thử lại.") };
    }

    const firstRow = Array.isArray(data) ? data[0] : data;
    if (!firstRow?.success && firstRow?.code !== "ALREADY_SUBMITTED") {
      return { success: false, error: mapErrorMessage(firstRow?.code, "Không thể nộp bài thi. Vui lòng thử lại.") };
    }

    return {
      success: true,
      status: firstRow.attempt_status,
      score: firstRow.score,
      maxScore: firstRow.max_score,
      correctAnswers: firstRow.correct_answers,
      wrongAnswers: firstRow.wrong_answers,
      blankAnswers: firstRow.blank_answers,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi nộp bài.";
    return { success: false, error: mapErrorMessage(msg, "Không thể nộp bài thi. Vui lòng thử lại.") };
  }
}

/**
 * Records an exam event (e.g. fullscreen exit, visibility hidden).
 */
export async function recordExamEventAction(input: {
  attemptId: string;
  eventType: "fullscreen_exit" | "visibility_hidden" | "fullscreen_return" | "visibility_visible" | "fullscreen_unsupported";
  metadata?: Record<string, unknown>;
}): Promise<
  | { success: true; eventId: string; serverOccurredAt: string; isDuplicate: boolean }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const guestHash = await getGuestSessionHash();

    const { data, error } = await supabase.rpc("record_exam_event", {
      p_attempt_id: input.attemptId,
      p_event_type: input.eventType,
      p_client_occurred_at: new Date().toISOString(),
      p_metadata: (input.metadata as unknown as Json) ?? {},
      p_guest_session_hash: guestHash ?? undefined,
    });

    if (error) {
      return { success: false, error: mapErrorMessage(error.message, "Không thể ghi nhận sự kiện vi phạm.") };
    }

    const firstRow = Array.isArray(data) ? data[0] : data;
    if (!firstRow || !firstRow.event_id) {
      return { success: false, error: "Không thể ghi nhận sự kiện vi phạm." };
    }

    return {
      success: true,
      eventId: firstRow.event_id,
      serverOccurredAt: firstRow.server_occurred_at,
      isDuplicate: firstRow.is_duplicate,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi ghi nhận sự kiện.";
    return { success: false, error: mapErrorMessage(msg, "Không thể ghi nhận sự kiện vi phạm.") };
  }
}

/**
 * Resolves active violation events for an attempt when student returns to fullscreen.
 */
export async function resolveExamEventAction(attemptId: string): Promise<
  | { success: true; resolvedCount: number }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const guestHash = await getGuestSessionHash();

    const { data, error } = await supabase.rpc("resolve_exam_event", {
      p_attempt_id: attemptId,
      p_guest_session_hash: guestHash ?? undefined,
    });

    if (error) {
      return { success: false, error: mapErrorMessage(error.message, "Không thể hủy cảnh báo vi phạm.") };
    }

    const firstRow = Array.isArray(data) ? data[0] : data;
    return {
      success: true,
      resolvedCount: firstRow?.resolved_count ?? 0,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi xử lý vi phạm.";
    return { success: false, error: mapErrorMessage(msg, "Không thể hủy cảnh báo vi phạm.") };
  }
}

/**
 * Gets result details for a submitted attempt.
 */
export async function getAttemptResultAction(attemptId: string): Promise<
  | { success: true; result: StudentAttemptResult }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const guestHash = await getGuestSessionHash();

    const { data, error } = await supabase.rpc("get_attempt_result", {
      p_attempt_id: attemptId,
      p_guest_session_hash: guestHash ?? undefined,
    });

    if (error) {
      return { success: false, error: mapErrorMessage(error.message, "Không thể tải kết quả bài thi.") };
    }

    const result = data as unknown as StudentAttemptResult;

    // Robust enrichment: ensure tolerance, correct_answer_raw, and is_correct are always populated
    if (result.questions_detail && result.questions_detail.length > 0) {
      const qIds = result.questions_detail.map((q) => q.question_id);
      const { data: dbQuestions } = await supabase
        .from("questions")
        .select("id, tolerance, correct_answer_raw")
        .in("id", qIds);

      const dbMap = new Map((dbQuestions || []).map((q) => [q.id, q]));

      result.questions_detail = result.questions_detail.map((q) => {
        const dbQ = dbMap.get(q.question_id);
        const resolvedTolerance = q.tolerance !== undefined && q.tolerance !== null ? q.tolerance : (dbQ?.tolerance ?? 0);
        const resolvedRawAnswer = q.correct_answer_raw || dbQ?.correct_answer_raw || null;

        let computedIsCorrect = q.is_correct;
        if (computedIsCorrect === undefined || computedIsCorrect === null) {
          if (q.question_type === "short_answer") {
            computedIsCorrect = evaluateMathAnswer(q.text_answer, resolvedRawAnswer, resolvedTolerance);
          } else if (q.question_type === "multiple_choice" || q.question_type === "regular") {
            computedIsCorrect = Boolean(q.selected_option_id && q.correct_option_id && q.selected_option_id === q.correct_option_id);
          }
        }

        return {
          ...q,
          tolerance: resolvedTolerance,
          correct_answer_raw: resolvedRawAnswer,
          is_correct: computedIsCorrect,
        };
      });
    }

    return {
      success: true,
      result,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải kết quả.";
    return { success: false, error: mapErrorMessage(msg, "Không thể tải kết quả bài thi.") };
  }
}
