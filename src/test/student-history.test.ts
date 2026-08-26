import { describe, it, expect } from "vitest";
import {
  formatSubmitReason,
  formatAttemptStatus,
  calculateDurationText,
  calculateNormalizedScore,
} from "@/lib/exams/history-queries";

describe("Phase 9: Student History & Statistics Helper Functions", () => {
  it("formats submit reasons correctly in Vietnamese", () => {
    expect(formatSubmitReason("student_submit")).toBe("Nộp bài");
    expect(formatSubmitReason("time_expired")).toBe("Hết thời gian");
    expect(formatSubmitReason("fullscreen_violation")).toBe("Vi phạm chế độ toàn màn hình");
    expect(formatSubmitReason("account_locked")).toBe("Tài khoản bị khóa");
    expect(formatSubmitReason("system_recovery")).toBe("Khôi phục hệ thống");
    expect(formatSubmitReason(null)).toBe("Nộp bài");
  });

  it("formats attempt status correctly in Vietnamese", () => {
    expect(formatAttemptStatus("submitted")).toBe("Đã nộp");
    expect(formatAttemptStatus("auto_submitted")).toBe("Tự động nộp");
    expect(formatAttemptStatus("expired")).toBe("Hết giờ");
    expect(formatAttemptStatus("in_progress")).toBe("Đang làm");
  });

  it("calculates duration text accurately", () => {
    const started = "2026-08-09T10:00:00.000Z";
    const submittedExactMinutes = "2026-08-09T10:32:00.000Z";
    const submittedWithSeconds = "2026-08-09T10:32:15.000Z";
    const submittedSecondsOnly = "2026-08-09T10:00:45.000Z";

    expect(calculateDurationText(started, submittedExactMinutes)).toEqual({
      minutes: 32,
      text: "32 phút",
    });

    expect(calculateDurationText(started, submittedWithSeconds)).toEqual({
      minutes: 32,
      text: "32 phút 15 giây",
    });

    expect(calculateDurationText(started, submittedSecondsOnly)).toEqual({
      minutes: 0,
      text: "45 giây",
    });

    expect(calculateDurationText(started, null)).toEqual({
      minutes: 0,
      text: "0 phút",
    });
  });

  describe("Phase 9 Patch: 10-Point Scale Normalized Score Calculation", () => {
    it("Test 1 — Đề 2 điểm (2/2 -> 10/10)", () => {
      expect(calculateNormalizedScore(2, 2)).toBe(10);
    });

    it("Test 2 — Đề 10 điểm (8/10 -> 8/10)", () => {
      expect(calculateNormalizedScore(8, 10)).toBe(8);
    });

    it("Test 3 — Đề 15 điểm (10/15 -> 6.67/10)", () => {
      expect(calculateNormalizedScore(10, 15)).toBe(6.67);
    });

    it("Test 4 — Điểm trung bình (2/2, 8/10, 10/15 -> 8.22/10)", () => {
      const s1 = calculateNormalizedScore(2, 2); // 10
      const s2 = calculateNormalizedScore(8, 10); // 8
      const s3 = calculateNormalizedScore(10, 15); // 6.67
      expect(s1).toBe(10);
      expect(s2).toBe(8);
      expect(s3).toBe(6.67);

      const scores = [s1!, s2!, s3!];
      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      expect(avg).toBe(8.22);
    });

    it("Test 5 — Điểm cao nhất (2/2, 8/10, 10/15 -> 10/10)", () => {
      const s1 = calculateNormalizedScore(2, 2); // 10
      const s2 = calculateNormalizedScore(8, 10); // 8
      const s3 = calculateNormalizedScore(10, 15); // 6.67

      const highest = Math.max(s1!, s2!, s3!);
      expect(highest).toBe(10);
    });

    it("Test 6 — Hai đề có max_score khác nhau nhưng cùng tỷ lệ (2/2, 13/13 -> avg 10, highest 10)", () => {
      const s1 = calculateNormalizedScore(2, 2); // 10
      const s2 = calculateNormalizedScore(13, 13); // 10
      expect(s1).toBe(10);
      expect(s2).toBe(10);

      const scores = [s1!, s2!];
      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      const highest = Math.max(...scores);

      expect(avg).toBe(10);
      expect(highest).toBe(10);
    });

    it("Edge cases — max_score <= 0, NaN or missing score", () => {
      expect(calculateNormalizedScore(5, 0)).toBeNull();
      expect(calculateNormalizedScore(5, -10)).toBeNull();
      expect(calculateNormalizedScore(null, 10)).toBeNull();
      expect(calculateNormalizedScore(5, null)).toBeNull();
      expect(calculateNormalizedScore(NaN, 10)).toBeNull();
    });
  });
});
