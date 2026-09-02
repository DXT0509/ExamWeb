import { describe, it, expect } from "vitest";
import { EXAM_TEMPLATES } from "@/lib/exams/templates";
import { evaluateMathAnswer } from "@/lib/exams/math-parser";

describe("Exam Builder UX Refinement & Template Fixed Logic", () => {
  it("correctly identifies fixed templates (THPT 2026 & HSA 2026) vs Custom", () => {
    const isFixedTemplate = (templateKey?: string | null) => {
      return templateKey === "thpt_math_2026" || templateKey === "hsa_math_2026";
    };

    expect(isFixedTemplate("thpt_math_2026")).toBe(true);
    expect(isFixedTemplate("hsa_math_2026")).toBe(true);
    expect(isFixedTemplate("custom")).toBe(false);
    expect(isFixedTemplate(null)).toBe(false);
    expect(isFixedTemplate(undefined)).toBe(false);
  });

  it("verifies THPT 2026 template has fixed question scores and types", () => {
    const thpt = EXAM_TEMPLATES.thpt_math_2026!;
    expect(thpt.key).toBe("thpt_math_2026");
    expect(thpt.defaultDurationMinutes).toBe(90);
    expect(thpt.defaultTotalScore).toBe(10);

    const questions = thpt.generateQuestions();
    expect(questions).toHaveLength(22);

    // 12 Multiple choice at 0.25 pt
    expect(questions.slice(0, 12).every((q) => q.question_type === "multiple_choice" && q.score === 0.25)).toBe(true);
    // 4 True/False groups at 1.0 pt
    expect(questions.slice(12, 16).every((q) => q.question_type === "true_false_group" && q.score === 1.0)).toBe(true);
    // 6 Short answer at 0.5 pt
    expect(questions.slice(16, 22).every((q) => q.question_type === "short_answer" && q.score === 0.5)).toBe(true);
  });

  it("verifies HSA 2026 template has fixed question scores and types", () => {
    const hsa = EXAM_TEMPLATES.hsa_math_2026!;
    expect(hsa.key).toBe("hsa_math_2026");
    expect(hsa.defaultDurationMinutes).toBe(75);
    expect(hsa.defaultTotalScore).toBe(50);

    const questions = hsa.generateQuestions();
    expect(questions).toHaveLength(50);

    // 35 Multiple choice at 1.0 pt
    expect(questions.slice(0, 35).every((q) => q.question_type === "multiple_choice" && q.score === 1.0)).toBe(true);
    // 15 Short answer at 1.0 pt
    expect(questions.slice(35, 50).every((q) => q.question_type === "short_answer" && q.score === 1.0)).toBe(true);
  });

  it("verifies math equality and tolerance behavior for Short Answer questions", () => {
    // 1/2 == 0.5 == 2/4 == 0.50
    expect(evaluateMathAnswer("1/2", "0.5")).toBe(true);
    expect(evaluateMathAnswer("2/4", "0.50")).toBe(true);
    expect(evaluateMathAnswer("0,5", "1/2")).toBe(true);
    expect(evaluateMathAnswer("-3/4", "-0.75")).toBe(true);

    // Tolerance for irrational numbers (sqrt(2) approx 1.4142)
    const expectedSqrt2 = "1.4142";
    expect(evaluateMathAnswer("1.41421356", expectedSqrt2, 0.001)).toBe(true);
    expect(evaluateMathAnswer("1.4135", expectedSqrt2, 0.001)).toBe(true);
    expect(evaluateMathAnswer("1.4150", expectedSqrt2, 0.001)).toBe(true);
    expect(evaluateMathAnswer("1.4100", expectedSqrt2, 0.001)).toBe(false);

    // Zero tolerance requires exact mathematical equality
    expect(evaluateMathAnswer("1/2", "0.5", 0)).toBe(true);
    expect(evaluateMathAnswer("1/2", "0.5000", 0)).toBe(true);
    expect(evaluateMathAnswer("0.51", "0.5", 0)).toBe(false);
  });
});
