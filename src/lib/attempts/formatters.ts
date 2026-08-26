import type { AttemptStatus, ExamEventType, SubmitReason } from "./types";

export function formatSubmitReason(reason: SubmitReason | string | null): string {
  if (!reason) return "-";
  switch (reason) {
    case "student_submit":
      return "Nộp bài thủ công";
    case "time_expired":
      return "Hết thời gian làm bài";
    case "fullscreen_violation":
      return "Vi phạm chế độ toàn màn hình";
    case "account_locked":
      return "Tài khoản bị khóa";
    case "system_recovery":
      return "Khôi phục hệ thống";
    default:
      return reason;
  }
}

export function formatAttemptStatus(status: AttemptStatus | string): string {
  switch (status) {
    case "in_progress":
      return "Đang làm";
    case "submitted":
      return "Đã nộp";
    case "auto_submitted":
      return "Tự động nộp";
    case "expired":
      return "Hết giờ";
    default:
      return status;
  }
}

export function formatEventType(type: ExamEventType | string): string {
  switch (type) {
    case "attempt_started":
      return "Bắt đầu lượt thi";
    case "answer_saved":
      return "Đã lưu câu trả lời";
    case "fullscreen_exit":
      return "Thoát chế độ toàn màn hình";
    case "visibility_hidden":
      return "Chuyển tab / Ẩn màn hình";
    case "fullscreen_return":
      return "Quay lại toàn màn hình";
    case "visibility_visible":
      return "Hiện lại màn hình";
    case "fullscreen_unsupported":
      return "Trình duyệt không hỗ trợ toàn màn hình";
    case "violation_resolved":
      return "Đã khôi phục chế độ toàn màn hình";
    case "account_locked":
      return "Tài khoản bị khóa";
    case "auto_submit_requested":
      return "Yêu cầu tự động nộp bài";
    case "submit_requested":
      return "Yêu cầu nộp bài";
    case "submit_completed":
      return "Hoàn tất nộp bài";
    case "network_recovered":
      return "Khôi phục kết nối mạng";
    default:
      return type;
  }
}

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
