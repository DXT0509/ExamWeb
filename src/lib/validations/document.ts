import { z } from "zod";
import { postgresUuidSchema, slugSchema } from "@/lib/validations/exam";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

const isValidHttpUrl = (urlString: string) => {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const documentSchema = z
  .object({
    id: postgresUuidSchema("Mã tài liệu không hợp lệ.").optional(),
    title: z
      .string()
      .trim()
      .min(2, "Tiêu đề tài liệu phải có ít nhất 2 ký tự.")
      .max(200, "Tiêu đề không được vượt quá 200 ký tự."),
    slug: slugSchema,
    description: optionalText(1000, "Mô tả không được vượt quá 1000 ký tự."),
    sourceType: z.enum(["file", "url"], {
      error: "Vui lòng chọn loại nguồn tài liệu hợp lệ.",
    }),
    filePath: z
      .string()
      .trim()
      .max(500, "Đường dẫn tệp không được vượt quá 500 ký tự.")
      .nullable()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : null)),
    externalUrl: z
      .string()
      .trim()
      .max(1000, "Liên kết không được vượt quá 1000 ký tự.")
      .nullable()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : null)),
    status: z.enum(["draft", "published", "archived"], {
      error: "Trạng thái tài liệu không hợp lệ.",
    }),
    isPublic: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceType === "file") {
      if (!data.filePath || data.filePath.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filePath"],
          message: "Vui lòng cung cấp đường dẫn tệp hoặc liên kết tài liệu.",
        });
      }
      if (data.externalUrl && data.externalUrl.trim().length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalUrl"],
          message: "Vui lòng chỉ chọn một nguồn tài liệu: đường dẫn tệp hoặc liên kết bên ngoài.",
        });
      }
    } else if (data.sourceType === "url") {
      if (!data.externalUrl || data.externalUrl.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalUrl"],
          message: "Vui lòng cung cấp đường dẫn tệp hoặc liên kết tài liệu.",
        });
      } else if (!isValidHttpUrl(data.externalUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalUrl"],
          message: "Liên kết bên ngoài phải bắt đầu bằng http:// hoặc https:// hợp lệ.",
        });
      }
      if (data.filePath && data.filePath.trim().length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filePath"],
          message: "Vui lòng chỉ chọn một nguồn tài liệu: đường dẫn tệp hoặc liên kết bên ngoài.",
        });
      }
    }
  });

export const MAX_DOCUMENT_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".zip",
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
] as const;

export function validateDocumentFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!file || file.size === 0) {
    return { ok: false, error: "Tệp tin không được để trống." };
  }

  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    return { ok: false, error: "Dung lượng tệp vượt quá giới hạn cho phép (tối đa 25MB)." };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  if (!hasValidExt) {
    return {
      ok: false,
      error: `Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp ${ALLOWED_DOCUMENT_EXTENSIONS.join(", ")}.`,
    };
  }

  return { ok: true };
}

export const documentStatusSchema = z.object({
  id: postgresUuidSchema("Mã tài liệu không hợp lệ."),
  status: z.enum(["draft", "published", "archived"], {
    error: "Trạng thái tài liệu không hợp lệ.",
  }),
});

export type DocumentInput = z.infer<typeof documentSchema>;
export type DocumentStatusInput = z.infer<typeof documentStatusSchema>;

