import { describe, it, expect } from "vitest";
import { EXAM_TEMPLATES, getTemplateConfig } from "@/lib/exams/templates";

describe("Exam Templates & Scaffolding", () => {
  it("scaffolds THPT Math 2026 exam template with 22 questions", () => {
    const template = EXAM_TEMPLATES.thpt_math_2026!;
    expect(template).toBeDefined();
    expect(template.defaultDurationMinutes).toBe(90);
    expect(template.defaultTotalScore).toBe(10);
    expect(template.scoringStrategy).toBe("thpt_math_2026");

    const questions = template.generateQuestions();
    expect(questions).toHaveLength(22);

    // Part 1: 12 MCQs (0.25 pt each, 4 options)
    const part1 = questions.slice(0, 12);
    expect(part1.every((q) => q.question_type === "multiple_choice")).toBe(true);
    expect(part1.every((q) => q.score === 0.25)).toBe(true);
    expect(part1.every((q) => q.options.length === 4)).toBe(true);

    // Part 2: 4 True/False Groups (1.0 pt each, 4 statements)
    const part2 = questions.slice(12, 16);
    expect(part2.every((q) => q.question_type === "true_false_group")).toBe(true);
    expect(part2.every((q) => q.score === 1.0)).toBe(true);
    expect(part2.every((q) => q.options.length === 4)).toBe(true);

    // Part 3: 6 Short Answer (0.5 pt each, 0 options)
    const part3 = questions.slice(16, 22);
    expect(part3.every((q) => q.question_type === "short_answer")).toBe(true);
    expect(part3.every((q) => q.score === 0.5)).toBe(true);
    expect(part3.every((q) => q.options.length === 0)).toBe(true);
  });

  it("scaffolds HSA Math 2026 exam template with 50 questions", () => {
    const template = EXAM_TEMPLATES.hsa_math_2026!;
    expect(template).toBeDefined();
    expect(template.defaultDurationMinutes).toBe(75);
    expect(template.defaultTotalScore).toBe(50);
    expect(template.scoringStrategy).toBe("hsa_math_2026");

    const questions = template.generateQuestions();
    expect(questions).toHaveLength(50);


    // Initially all 50 questions are multiple choice (1.0 pt each, 4 options),
    // and can be toggled to short answer as needed by admin
    expect(questions.every((q) => q.question_type === "multiple_choice")).toBe(true);
    expect(questions.every((q) => q.score === 1.0)).toBe(true);
    expect(questions.every((q) => q.options.length === 4)).toBe(true);
  });

  it("resolves template config safely", () => {
    expect(getTemplateConfig("thpt_math_2026").key).toBe("thpt_math_2026");
    expect(getTemplateConfig("hsa_math_2026").key).toBe("hsa_math_2026");
    expect(getTemplateConfig("custom").key).toBe("custom");
    expect(getTemplateConfig(null).key).toBe("custom");
  });
});
