import type { PostgrestError } from "@supabase/supabase-js";

const messages: Record<string, string> = {
  ADMIN_REQUIRED: "Bạn cần quyền Quản trị viên để thực hiện thao tác này.",
  CATEGORY_INACTIVE: "Danh mục kỳ thi không hoạt động hoặc đã bị xóa.",
  CLONE_SLUG_NOT_UNIQUE: "Slug đề thi mới đã được sử dụng.",
  DUPLICATE_SLUG: "Slug này đã được sử dụng.",
  EXAM_CONTENT_LOCKED: "Đề thi đã được xuất bản nên nội dung câu hỏi hiện đang bị khóa.",
  EXAM_HAS_NO_SECTION: "Đề thi phải có ít nhất một phần thi.",
  EXAM_NOT_ARCHIVABLE: "Chỉ có thể lưu trữ đề đã xuất bản hoặc đã đóng.",
  EXAM_NOT_DRAFT: "Chỉ có thể chỉnh sửa nội dung của đề thi nháp.",
  EXAM_NOT_FOUND: "Không tìm thấy đề thi.",
  EXAM_NOT_PUBLISHED: "Chỉ có thể thực hiện thao tác này với đề đã xuất bản.",
  INVALID_CLONE_INPUT: "Tiêu đề hoặc slug đề thi mới không hợp lệ.",
  INVALID_DURATION: "Thời gian làm bài phải từ 1 đến 300 phút.",
  INVALID_GUEST_ACCESS: "Chỉ đề công khai mới cho phép Guest làm bài.",
  QUESTION_HAS_TOO_FEW_OPTIONS: "Mỗi câu hỏi phải có ít nhất hai lựa chọn.",
  QUESTION_INVALID_CORRECT_OPTION_COUNT: "Mỗi câu hỏi phải có chính xác một đáp án đúng.",
  QUESTION_INVALID_SCORE: "Điểm câu hỏi phải lớn hơn 0.",
  RANDOMIZATION_NOT_SUPPORTED: "Chưa hỗ trợ đảo thứ tự câu hỏi hoặc lựa chọn trong MVP.",
  REORDER_INVALID_ITEMS: "Danh sách sắp xếp không khớp với dữ liệu hiện có.",
  SLUG_ALREADY_EXISTS: "Slug này đã được sử dụng.",
  SUBJECT_INACTIVE: "Môn học không hoạt động hoặc đã bị xóa.",
  TOTAL_SCORE_SERVER_CONTROLLED: "Tổng điểm do hệ thống tính toán khi xuất bản đề.",
};

export function getDatabaseErrorMessage(errorOrCode: PostgrestError | Error | string | null | undefined): string {
  if (!errorOrCode) return "Không thể lưu thay đổi. Vui lòng thử lại.";
  const rawMessage = typeof errorOrCode === "string" ? errorOrCode : errorOrCode.message;
  const code = rawMessage in messages ? rawMessage : rawMessage.match(/[A-Z][A-Z0-9_]{2,}/)?.[0];
  if (code && messages[code]) return messages[code] ?? "Không thể lưu thay đổi. Vui lòng thử lại.";
  if ("code" in Object(errorOrCode) && Object(errorOrCode).code === "23505") return messages.DUPLICATE_SLUG ?? "Slug này đã được sử dụng.";
  return "Không thể lưu thay đổi. Vui lòng kiểm tra dữ liệu và thử lại.";
}

export function getRpcResultError(result: { success: boolean; code: string } | null | undefined): string | null {
  if (!result) return "Không nhận được phản hồi từ hệ thống.";
  return result.success ? null : getDatabaseErrorMessage(result.code);
}
