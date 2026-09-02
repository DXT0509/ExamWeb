export type QuestionType =
  | "multiple_choice"
  | "true_false_group"
  | "short_answer"
  | "question_group"
  | "regular";

export interface ScaffoldedOption {
  content: string;
  position: number;
  is_correct: boolean;
}

export interface ScaffoldedQuestion {
  position: number;
  content: string;
  question_type: QuestionType;
  score: number;
  correct_answer_raw?: string | null;
  tolerance?: number | null;
  explanation?: string | null;
  options: ScaffoldedOption[];
}

export interface ExamTemplateConfig {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly defaultDurationMinutes: number;
  readonly defaultTotalScore: number;
  readonly scoringStrategy: string;
  readonly generateQuestions: () => ScaffoldedQuestion[];
}

export const EXAM_TEMPLATES: Record<string, ExamTemplateConfig> = {
  thpt_math_2026: {
    key: "thpt_math_2026",
    name: "Toán tốt nghiệp THPT 2026",
    description:
      "Cấu trúc chuẩn 2026: 12 câu trắc nghiệm nhiều lựa chọn (3đ) + 4 câu Đúng/Sai (4đ) + 6 câu trả lời ngắn (3đ) — Thời gian 90 phút, thang điểm 10.",
    defaultDurationMinutes: 90,
    defaultTotalScore: 10,
    scoringStrategy: "thpt_math_2026",
    generateQuestions: () => {
      const questions: ScaffoldedQuestion[] = [];

      // Phần I: 12 câu trắc nghiệm nhiều lựa chọn (Câu 1 -> 12, 0.25đ/câu)
      for (let i = 1; i <= 12; i++) {
        questions.push({
          position: i,
          content: "",
          question_type: "multiple_choice",
          score: 0.25,
          options: [
            { content: "", position: 1, is_correct: true },
            { content: "", position: 2, is_correct: false },
            { content: "", position: 3, is_correct: false },
            { content: "", position: 4, is_correct: false },
          ],
        });
      }

      // Phần II: 4 câu Đúng/Sai (Câu 13 -> 16, 1.0đ/câu, mỗi câu 4 ý a, b, c, d)
      for (let i = 13; i <= 16; i++) {
        questions.push({
          position: i,
          content: "",
          question_type: "true_false_group",
          score: 1.0,
          options: [
            { content: "", position: 1, is_correct: true },
            { content: "", position: 2, is_correct: false },
            { content: "", position: 3, is_correct: true },
            { content: "", position: 4, is_correct: false },
          ],
        });
      }

      // Phần III: 6 câu trả lời ngắn (Câu 17 -> 22, 0.5đ/câu)
      for (let i = 17; i <= 22; i++) {
        questions.push({
          position: i,
          content: "",
          question_type: "short_answer",
          score: 0.5,
          correct_answer_raw: "",
          tolerance: 0,
          options: [],
        });
      }

      return questions;
    },
  },

  hsa_math_2026: {
    key: "hsa_math_2026",
    name: "Toán HSA 2026 — Phần Toán học & Xử lý số liệu",
    description:
      "Cấu trúc HSA ĐHQGHN 2026: 35 câu trắc nghiệm 4 lựa chọn + 15 câu điền đáp án ngắn — Thời gian 75 phút.",
    defaultDurationMinutes: 75,
    defaultTotalScore: 50,
    scoringStrategy: "hsa_math_2026",
    generateQuestions: () => {
      const questions: ScaffoldedQuestion[] = [];

      // Câu 1 -> Câu 35: Multiple Choice 4 lựa chọn
      for (let i = 1; i <= 35; i++) {
        questions.push({
          position: i,
          content: "",
          question_type: "multiple_choice",
          score: 1.0,
          options: [
            { content: "", position: 1, is_correct: true },
            { content: "", position: 2, is_correct: false },
            { content: "", position: 3, is_correct: false },
            { content: "", position: 4, is_correct: false },
          ],
        });
      }

      // Câu 36 -> Câu 50: Short Answer (Điền đáp án)
      for (let i = 36; i <= 50; i++) {
        questions.push({
          position: i,
          content: "",
          question_type: "short_answer",
          score: 1.0,
          correct_answer_raw: "",
          tolerance: 0,
          options: [],
        });
      }

      return questions;
    },
  },

  custom: {
    key: "custom",
    name: "Tự do / Môn học khác",
    description: "Tự do thêm và cấu hình câu hỏi theo nhu cầu riêng.",
    defaultDurationMinutes: 60,
    defaultTotalScore: 10,
    scoringStrategy: "standard",
    generateQuestions: () => [],
  },
};

export const TEMPLATE_OPTIONS = [
  {
    key: "thpt_math_2026",
    name: "Toán tốt nghiệp THPT 2026 (12 trắc nghiệm, 4 Đúng/Sai, 6 trả lời ngắn — 90 phút)",
    duration: 90,
  },
  {
    key: "hsa_math_2026",
    name: "Toán HSA 2026 — Phần Toán học & Xử lý số liệu (35 trắc nghiệm, 15 điền đáp án — 75 phút)",
    duration: 75,
  },
  {
    key: "custom",
    name: "Tự do / Môn khác (Tự thêm câu hỏi theo nhu cầu)",
    duration: 60,
  },
];

export function getTemplateConfig(key?: string | null): ExamTemplateConfig {
  if (key && EXAM_TEMPLATES[key]) {
    return EXAM_TEMPLATES[key] as ExamTemplateConfig;
  }
  return EXAM_TEMPLATES.custom as ExamTemplateConfig;
}

