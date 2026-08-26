import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug không được để trống.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ được chứa chữ thường, số và dấu gạch ngang.");

export const postgresUuidSchema = (message: string) =>
  z.string().trim().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message);

const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} phải có ít nhất 2 ký tự.`)
    .max(100, `${label} không được vượt quá 100 ký tự.`);

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const subjectSchema = z.object({
  name: nameSchema("Tên môn học"),
  slug: slugSchema,
  description: optionalText(500, "Mô tả không được vượt quá 500 ký tự."),
  isActive: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: nameSchema("Tên danh mục"),
  slug: slugSchema,
  description: optionalText(500, "Mô tả không được vượt quá 500 ký tự."),
  isActive: z.boolean().optional(),
});

export const examDraftSchema = z
  .object({
    subjectId: postgresUuidSchema("Môn học không hợp lệ."),
    categoryId: postgresUuidSchema("Danh mục không hợp lệ.").nullable().optional(),
    title: z.string().trim().min(2, "Đề thi phải có tiêu đề.").max(200, "Tiêu đề không được vượt quá 200 ký tự."),
    slug: slugSchema.optional(),
    description: optionalText(1000, "Mô tả không được vượt quá 1000 ký tự."),
    accessType: z.enum(["public", "students_only", "private"]),
    allowGuestAttempt: z.boolean(),
    fullscreenRequired: z.boolean(),
    durationMinutes: z.number().int("Thời gian làm bài phải là số nguyên.").min(1, "Thời gian làm bài phải từ 1 đến 300 phút.").max(300, "Thời gian làm bài phải từ 1 đến 300 phút."),
    randomizeQuestions: z.literal(false, "Chưa hỗ trợ đảo thứ tự câu hỏi trong MVP."),
    randomizeOptions: z.literal(false, "Chưa hỗ trợ đảo thứ tự đáp án trong MVP."),
    showScoreAfterSubmit: z.boolean(),
    showAnswersAfterSubmit: z.boolean(),
    showSolutionsAfterSubmit: z.boolean(),
  })
  .transform((value) => ({
    ...value,
    allowGuestAttempt: value.accessType === "public" ? value.allowGuestAttempt : false,
  }));

export const sectionSchema = z.object({
  examId: postgresUuidSchema("Đề thi không hợp lệ.").optional(),
  sectionId: postgresUuidSchema("Phần thi không hợp lệ.").optional(),
  title: z.string().trim().min(1, "Tên phần thi không được để trống.").max(200, "Tên phần thi không được vượt quá 200 ký tự."),
  description: optionalText(500, "Mô tả không được vượt quá 500 ký tự."),
  position: z.number().int("Thứ tự phần thi phải là số nguyên.").min(1, "Thứ tự phần thi phải lớn hơn hoặc bằng 1."),
});

export const questionSchema = z.object({
  sectionId: postgresUuidSchema("Phần thi không hợp lệ.").optional(),
  questionId: postgresUuidSchema("Câu hỏi không hợp lệ.").optional(),
  content: z.string().trim(),
  imagePath: optionalText(5000000, "Đường dẫn ảnh không được vượt quá 5MB."),
  explanation: optionalText(2000, "Lời giải không được vượt quá 2000 ký tự."),
  score: z.number().positive("Điểm câu hỏi phải lớn hơn 0."),
  position: z.number().int("Thứ tự câu hỏi phải là số nguyên.").min(1, "Thứ tự câu hỏi phải lớn hơn hoặc bằng 1."),
  isActive: z.boolean().optional(),
});

export const optionSchema = z.object({
  questionId: postgresUuidSchema("Câu hỏi không hợp lệ.").optional(),
  optionId: postgresUuidSchema("Lựa chọn không hợp lệ.").optional(),
  content: z.string().trim().min(1, "Nội dung lựa chọn không được để trống."),
  position: z.number().int("Thứ tự lựa chọn phải là số nguyên.").min(1, "Thứ tự lựa chọn phải lớn hơn hoặc bằng 1."),
  isCorrect: z.boolean(),
  isActive: z.boolean().optional(),
});

export const publishExamSchema = z.object({ examId: postgresUuidSchema("Đề thi không hợp lệ.") });
export const cloneExamSchema = z.object({
  sourceExamId: postgresUuidSchema("Đề thi nguồn không hợp lệ."),
  newTitle: z.string().trim().min(2, "Đề thi phải có tiêu đề.").max(200, "Tiêu đề không được vượt quá 200 ký tự."),
  newSlug: slugSchema,
});
export const reorderSchema = z.object({
  parentId: postgresUuidSchema("Dữ liệu cha không hợp lệ."),
  orderedIds: z.array(postgresUuidSchema("Mã sắp xếp không hợp lệ.")).min(1, "Cần có ít nhất một mục để sắp xếp."),
});

export const ALLOWED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateQuestionImageFile(file: File | null): { ok: true } | { ok: false; error: string } {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Vui lòng chọn tệp hình ảnh hợp lệ." };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: "Dung lượng hình ảnh không được vượt quá 5MB." };
  }

  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.includes(mime)) {
    return {
      ok: false,
      error: "Định dạng không được hỗ trợ. Vui lòng chọn ảnh PNG, JPG, WebP hoặc GIF.",
    };
  }

  return { ok: true };
}

export type SubjectInput = z.infer<typeof subjectSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ExamDraftInput = z.infer<typeof examDraftSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type OptionInput = z.infer<typeof optionSchema>;
export type CloneExamInput = z.infer<typeof cloneExamSchema>;

