import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const startAttemptSchema = z.object({
  examId: z.string().regex(uuidRegex, { message: "Mã đề thi không hợp lệ." }),
});

export const saveAnswerSchema = z.object({
  attemptId: z.string().regex(uuidRegex, { message: "Mã bài thi không hợp lệ." }),
  questionId: z.string().regex(uuidRegex, { message: "Mã câu hỏi không hợp lệ." }),
  selectedOptionId: z.string().regex(uuidRegex, { message: "Mã đáp án không hợp lệ." }).nullable().optional(),
  isMarked: z.boolean().default(false),
});

export const submitAttemptSchema = z.object({
  attemptId: z.string().regex(uuidRegex, { message: "Mã bài thi không hợp lệ." }),
  idempotencyKey: z.string().optional(),
  submitReason: z.enum(["student_submit", "time_expired", "fullscreen_violation", "account_locked", "system_recovery"]).optional(),
});

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
