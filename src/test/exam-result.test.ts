import { describe, it, expect } from "vitest";
import { formatSubmitReasonText, formatDurationText } from "@/components/exams/exam-result-ui";

describe("Phase 9: Exam Result UI Helpers", () => {
  it("translates all submit reasons to correct Vietnamese text", () => {
    expect(formatSubmitReasonText("student_submit")).toBe("Bài thi đã được nộp thành công");
    expect(formatSubmitReasonText("time_expired")).toBe("Bài thi đã được tự động nộp do hết giờ");
    expect(formatSubmitReasonText("fullscreen_violation")).toBe("Bài thi đã bị nộp tự động do vi phạm toàn màn hình");
    expect(formatSubmitReasonText("account_locked")).toBe("Bài thi đã được nộp do tài khoản bị khóa");
    expect(formatSubmitReasonText("system_recovery")).toBe("Bài thi đã được nộp do hệ thống khôi phục");
    expect(formatSubmitReasonText(null)).toBe("Bài thi đã được nộp");
  });

  it("calculates formatted duration correctly for result display", () => {
    const startedAt = "2026-08-09T08:00:00.000Z";
    const submittedAt = "2026-08-09T08:25:30.000Z";

    expect(formatDurationText(startedAt, submittedAt)).toBe("25 phút 30 giây");
    expect(formatDurationText(startedAt, null)).toBe("—");
  });
});
