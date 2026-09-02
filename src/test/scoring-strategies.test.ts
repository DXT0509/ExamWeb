import { describe, it, expect } from "vitest";
import {
  THPTMath2026ScoringStrategy,
  HSAMath2026ScoringStrategy,
  getScoringStrategy,
} from "@/lib/exams/scoring-strategies";

describe("THPT Math 2026 Scoring Strategy Engine", () => {
  const strategy = new THPTMath2026ScoringStrategy();

  it("evaluates Multiple Choice question correctly (0.25 pt)", () => {
    const question = {
      id: "q-1",
      question_type: "multiple_choice",
      score: 0.25,
      options: [
        { id: "opt-a", is_correct: true },
        { id: "opt-b", is_correct: false },
      ],
    };

    // Correct choice
    const res1 = strategy.evaluateQuestion(question, {
      question_id: "q-1",
      selected_option_id: "opt-a",
    });
    expect(res1.isCorrect).toBe(true);
    expect(res1.score).toBe(0.25);

    // Wrong choice
    const res2 = strategy.evaluateQuestion(question, {
      question_id: "q-1",
      selected_option_id: "opt-b",
    });
    expect(res2.isCorrect).toBe(false);
    expect(res2.score).toBe(0);
  });

  it("evaluates True/False Group with official THPT 2026 scale (0.1, 0.25, 0.5, 1.0)", () => {
    const question = {
      id: "q-tf-1",
      question_type: "true_false_group",
      score: 1.0,
      options: [
        { id: "opt-a", is_correct: true },
        { id: "opt-b", is_correct: false },
        { id: "opt-c", is_correct: true },
        { id: "opt-d", is_correct: false },
      ],
    };

    // 4 statements correct -> 1.0 pt
    const res4 = strategy.evaluateQuestion(question, {
      question_id: "q-tf-1",
      sub_answers: {
        "opt-a": true,
        "opt-b": false,
        "opt-c": true,
        "opt-d": false,
      },
    });
    expect(res4.isCorrect).toBe(true);
    expect(res4.correctCount).toBe(4);
    expect(res4.score).toBe(1.0);

    // 3 statements correct -> 0.5 pt
    const res3 = strategy.evaluateQuestion(question, {
      question_id: "q-tf-1",
      sub_answers: {
        "opt-a": true,
        "opt-b": false,
        "opt-c": true,
        "opt-d": true, // wrong
      },
    });
    expect(res3.isCorrect).toBe(false);
    expect(res3.isPartial).toBe(true);
    expect(res3.correctCount).toBe(3);
    expect(res3.score).toBe(0.5);

    // 2 statements correct -> 0.25 pt
    const res2 = strategy.evaluateQuestion(question, {
      question_id: "q-tf-1",
      sub_answers: {
        "opt-a": true,
        "opt-b": true, // wrong
        "opt-c": true,
        "opt-d": true, // wrong
      },
    });
    expect(res2.correctCount).toBe(2);
    expect(res2.score).toBe(0.25);

    // 1 statement correct -> 0.1 pt
    const res1 = strategy.evaluateQuestion(question, {
      question_id: "q-tf-1",
      sub_answers: {
        "opt-a": true,
        "opt-b": true, // wrong
        "opt-c": false, // wrong
        "opt-d": true, // wrong
      },
    });
    expect(res1.correctCount).toBe(1);
    expect(res1.score).toBe(0.1);

    // 0 statements correct -> 0.0 pt
    const res0 = strategy.evaluateQuestion(question, {
      question_id: "q-tf-1",
      sub_answers: {
        "opt-a": false, // wrong
        "opt-b": true, // wrong
        "opt-c": false, // wrong
        "opt-d": true, // wrong
      },
    });
    expect(res0.correctCount).toBe(0);
    expect(res0.score).toBe(0);
  });

  it("evaluates Short Answer question with math parser (0.5 pt)", () => {
    const question = {
      id: "q-sa-1",
      question_type: "short_answer",
      score: 0.5,
      correct_answer_raw: "1/2",
      tolerance: 0,
    };

    // Fraction input
    const res1 = strategy.evaluateQuestion(question, {
      question_id: "q-sa-1",
      text_answer: "1/2",
    });
    expect(res1.isCorrect).toBe(true);
    expect(res1.score).toBe(0.5);

    // Equivalent decimal input
    const res2 = strategy.evaluateQuestion(question, {
      question_id: "q-sa-1",
      text_answer: "0.50",
    });
    expect(res2.isCorrect).toBe(true);
    expect(res2.score).toBe(0.5);

    // Comma decimal input
    const res3 = strategy.evaluateQuestion(question, {
      question_id: "q-sa-1",
      text_answer: "0,5",
    });
    expect(res3.isCorrect).toBe(true);
    expect(res3.score).toBe(0.5);

    // Wrong input
    const res4 = strategy.evaluateQuestion(question, {
      question_id: "q-sa-1",
      text_answer: "3/4",
    });
    expect(res4.isCorrect).toBe(false);
    expect(res4.score).toBe(0);
  });

  it("validates THPT 2026 exam structure (12 MCQs + 4 True/False + 6 Short Answer = 22 questions, 10.0 pts)", () => {
    const validQuestions = [
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `mcq-${i + 1}`,
        question_type: "multiple_choice",
        score: 0.25,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `tf-${i + 1}`,
        question_type: "true_false_group",
        score: 1.0,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `sa-${i + 1}`,
        question_type: "short_answer",
        score: 0.5,
      })),
    ];

    const validation = strategy.validateStructure(validQuestions);
    expect(validation.isValid).toBe(true);
    expect(validation.warnings).toHaveLength(0);
    expect(strategy.calculateExamTotal(validQuestions)).toBe(10);
  });
});

describe("HSA Math 2026 Scoring Strategy Engine", () => {
  const strategy = new HSAMath2026ScoringStrategy();

  it("validates HSA 2026 exam structure (35 MCQs + 15 Short Answer = 50 questions, 50 pts)", () => {
    const validQuestions = [
      ...Array.from({ length: 35 }, (_, i) => ({
        id: `mcq-${i + 1}`,
        question_type: "multiple_choice",
        score: 1.0,
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `sa-${i + 1}`,
        question_type: "short_answer",
        score: 1.0,
      })),
    ];

    const validation = strategy.validateStructure(validQuestions);
    expect(validation.isValid).toBe(true);
    expect(validation.warnings).toHaveLength(0);
    expect(strategy.calculateExamTotal(validQuestions)).toBe(50);
  });
});

describe("Strategy Factory", () => {
  it("resolves registered strategy keys or defaults to standard", () => {
    expect(getScoringStrategy("thpt_math_2026").key).toBe("thpt_math_2026");
    expect(getScoringStrategy("hsa_math_2026").key).toBe("hsa_math_2026");
    expect(getScoringStrategy("unknown_key").key).toBe("standard");
    expect(getScoringStrategy(null).key).toBe("standard");
  });
});
