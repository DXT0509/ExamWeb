import { z } from "zod";

export const startAttemptSchema = z.object({
  examId: z.string().uuid({ message: "Mã đề thi không hợp lệ." }),
});

export const saveAnswerSchema = z.object({
  attemptId: z.string().uuid({ message: "Mã bài thi không hợp lệ." }),
  questionId: z.string().uuid({ message: "Mã câu hỏi không hợp lệ." }),
  selectedOptionId: z.string().uuid({ message: "Mã đáp án không hợp lệ." }).nullable().optional(),
  isMarked: z.boolean().default(false),
});

export const submitAttemptSchema = z.object({
  attemptId: z.string().uuid({ message: "Mã bài thi không hợp lệ." }),
  idempotencyKey: z.string().optional(),
  submitReason: z.enum(["student_submit", "time_expired", "fullscreen_violation", "account_locked", "system_recovery"]).optional(),
});

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
