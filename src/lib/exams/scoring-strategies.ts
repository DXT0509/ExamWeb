import { evaluateMathAnswer } from "./math-parser";

export interface QuestionEvaluationItem {
  id: string;
  question_type: string;
  score: number;
  correct_answer_raw?: string | null;
  tolerance?: number | null;
  options?: Array<{
    id: string;
    is_correct: boolean;
    position?: number;
  }>;
}

export interface StudentAnswerItem {
  question_id: string;
  selected_option_id?: string | null;
  text_answer?: string | null;
  sub_answers?: Record<string, boolean> | null;
}

export interface QuestionScoreResult {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  isPartial?: boolean;
  correctCount?: number;
  totalCount?: number;
}

export interface ScoringStrategy {
  readonly key: string;
  readonly name: string;
  readonly defaultTotalScore: number;
  readonly defaultDurationMinutes: number;

  evaluateQuestion(
    question: QuestionEvaluationItem,
    answer?: StudentAnswerItem | null
  ): QuestionScoreResult;

  calculateExamTotal(questions: QuestionEvaluationItem[]): number;

  validateStructure(questions: QuestionEvaluationItem[]): {
    isValid: boolean;
    warnings: string[];
  };
}

/**
 * THPT Math 2026 Scoring Strategy
 * Part I: 12 Multiple Choice (0.25 pt each) -> 3.0 pts
 * Part II: 4 True/False Groups (4 statements each, 0->0, 1->0.1, 2->0.25, 3->0.5, 4->1.0) -> 4.0 pts
 * Part III: 6 Short Answers (0.5 pt each) -> 3.0 pts
 * Total: 10.0 pts
 */
export class THPTMath2026ScoringStrategy implements ScoringStrategy {
  readonly key = "thpt_math_2026";
  readonly name = "Toán tốt nghiệp THPT 2026";
  readonly defaultTotalScore = 10;
  readonly defaultDurationMinutes = 90;

  evaluateQuestion(
    question: QuestionEvaluationItem,
    answer?: StudentAnswerItem | null
  ): QuestionScoreResult {
    const qType = question.question_type || "multiple_choice";
    const qScore = question.score > 0 ? question.score : 1;

    if (!answer) {
      return { score: 0, maxScore: qScore, isCorrect: false };
    }

    if (qType === "multiple_choice" || qType === "regular") {
      if (!answer.selected_option_id) {
        return { score: 0, maxScore: qScore, isCorrect: false };
      }
      const correctOpt = question.options?.find((o) => o.is_correct);
      const isCorrect = correctOpt ? correctOpt.id === answer.selected_option_id : false;
      return {
        score: isCorrect ? qScore : 0,
        maxScore: qScore,
        isCorrect,
      };
    }

    if (qType === "short_answer") {
      if (!answer.text_answer || answer.text_answer.trim().length === 0) {
        return { score: 0, maxScore: qScore, isCorrect: false };
      }
      const isCorrect = evaluateMathAnswer(
        answer.text_answer,
        question.correct_answer_raw,
        question.tolerance ?? 0
      );
      return {
        score: isCorrect ? qScore : 0,
        maxScore: qScore,
        isCorrect,
      };
    }

    if (qType === "true_false_group") {
      const options = question.options || [];
      const subAns = answer.sub_answers || {};
      let correctCount = 0;
      const totalCount = options.length > 0 ? options.length : 4;

      options.forEach((opt) => {
        const studentChoice = subAns[opt.id];
        if (studentChoice !== undefined && studentChoice === opt.is_correct) {
          correctCount += 1;
        }
      });

      // Official THPT 2026 scoring rule:
      // 0 correct -> 0.00
      // 1 correct -> 0.10
      // 2 correct -> 0.25
      // 3 correct -> 0.50
      // 4 correct -> 1.00
      let earned = 0;
      if (correctCount === 4) earned = 1.0;
      else if (correctCount === 3) earned = 0.5;
      else if (correctCount === 2) earned = 0.25;
      else if (correctCount === 1) earned = 0.1;
      else earned = 0;

      // Scale if question has custom score weight
      if (qScore !== 1.0 && qScore > 0) {
        earned = (earned * qScore);
      }

      return {
        score: earned,
        maxScore: qScore,
        isCorrect: correctCount === totalCount && totalCount > 0,
        isPartial: correctCount > 0 && correctCount < totalCount,
        correctCount,
        totalCount,
      };
    }

    return { score: 0, maxScore: qScore, isCorrect: false };
  }

  calculateExamTotal(questions: QuestionEvaluationItem[]): number {
    return questions.reduce((sum, q) => sum + (q.score || 0), 0);
  }

  validateStructure(questions: QuestionEvaluationItem[]): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const mcqs = questions.filter((q) => (q.question_type || "multiple_choice") === "multiple_choice");
    const tfs = questions.filter((q) => q.question_type === "true_false_group");
    const shorts = questions.filter((q) => q.question_type === "short_answer");

    if (mcqs.length !== 12) {
      warnings.push(`Phần I (Trắc nghiệm nhiều lựa chọn): hiện có ${mcqs.length}/12 câu.`);
    }
    if (tfs.length !== 4) {
      warnings.push(`Phần II (Trắc nghiệm Đúng/Sai): hiện có ${tfs.length}/4 câu.`);
    }
    if (shorts.length !== 6) {
      warnings.push(`Phần III (Trắc nghiệm trả lời ngắn): hiện có ${shorts.length}/6 câu.`);
    }
    if (questions.length !== 22) {
      warnings.push(`Tổng số câu hỏi hiện là ${questions.length}/22 câu.`);
    }

    const totalScore = this.calculateExamTotal(questions);
    if (Math.abs(totalScore - 10) > 0.01) {
      warnings.push(`Tổng điểm đề thi là ${totalScore.toFixed(2)} (chuẩn THPT là 10.00 điểm).`);
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * HSA Math 2026 Scoring Strategy
 * Part 1: 35 Multiple Choice (4 options A, B, C, D)
 * Part 2: 15 Short Answer (Điền đáp án)
 * Total: 50 Questions / 75 minutes
 */
export class HSAMath2026ScoringStrategy implements ScoringStrategy {
  readonly key = "hsa_math_2026";
  readonly name = "Toán HSA 2026 — Toán học & Xử lý số liệu";
  readonly defaultTotalScore = 50;
  readonly defaultDurationMinutes = 75;

  evaluateQuestion(
    question: QuestionEvaluationItem,
    answer?: StudentAnswerItem | null
  ): QuestionScoreResult {
    const qType = question.question_type || "multiple_choice";
    const qScore = question.score > 0 ? question.score : 1;

    if (!answer) {
      return { score: 0, maxScore: qScore, isCorrect: false };
    }

    if (qType === "multiple_choice" || qType === "regular") {
      const correctOpt = question.options?.find((o) => o.is_correct);
      const isCorrect = correctOpt ? correctOpt.id === answer.selected_option_id : false;
      return { score: isCorrect ? qScore : 0, maxScore: qScore, isCorrect };
    }

    if (qType === "short_answer") {
      if (!answer.text_answer || answer.text_answer.trim().length === 0) {
        return { score: 0, maxScore: qScore, isCorrect: false };
      }
      const isCorrect = evaluateMathAnswer(
        answer.text_answer,
        question.correct_answer_raw,
        question.tolerance ?? 0
      );
      return { score: isCorrect ? qScore : 0, maxScore: qScore, isCorrect };
    }

    return { score: 0, maxScore: qScore, isCorrect: false };
  }

  calculateExamTotal(questions: QuestionEvaluationItem[]): number {
    return questions.reduce((sum, q) => sum + (q.score || 0), 0);
  }

  validateStructure(questions: QuestionEvaluationItem[]): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const mcqs = questions.filter((q) => (q.question_type || "multiple_choice") === "multiple_choice");
    const shorts = questions.filter((q) => q.question_type === "short_answer");

    if (questions.length !== 50) {
      warnings.push(`Tổng số câu hỏi hiện là ${questions.length}/50 câu.`);
    }
    if (mcqs.length + shorts.length !== questions.length) {
      warnings.push("Đề thi HSA 2026 chỉ gồm 2 dạng: Trắc nghiệm 4 lựa chọn và Điền đáp án ngắn.");
    }
    if (mcqs.length !== 35 || shorts.length !== 15) {
      warnings.push(
        `Cơ cấu tiêu chuẩn HSA: 35 câu trắc nghiệm và 15 câu điền đáp án (Hiện có: ${mcqs.length} trắc nghiệm, ${shorts.length} điền đáp án).`
      );
    }

    return {
      isValid: questions.length === 50 && mcqs.length + shorts.length === 50,
      warnings,
    };
  }
}

/**
 * Standard / Custom Scoring Strategy
 */
export class StandardScoringStrategy implements ScoringStrategy {
  readonly key = "standard";
  readonly name = "Chuẩn / Tự do";
  readonly defaultTotalScore = 10;
  readonly defaultDurationMinutes = 60;

  evaluateQuestion(
    question: QuestionEvaluationItem,
    answer?: StudentAnswerItem | null
  ): QuestionScoreResult {
    const qType = question.question_type || "multiple_choice";
    const qScore = question.score > 0 ? question.score : 1;

    if (!answer) {
      return { score: 0, maxScore: qScore, isCorrect: false };
    }

    if (qType === "multiple_choice" || qType === "regular") {
      const correctOpt = question.options?.find((o) => o.is_correct);
      const isCorrect = correctOpt ? correctOpt.id === answer.selected_option_id : false;
      return { score: isCorrect ? qScore : 0, maxScore: qScore, isCorrect };
    }

    if (qType === "short_answer") {
      if (!answer.text_answer || answer.text_answer.trim().length === 0) {
        return { score: 0, maxScore: qScore, isCorrect: false };
      }
      const isCorrect = evaluateMathAnswer(
        answer.text_answer,
        question.correct_answer_raw,
        question.tolerance ?? 0
      );
      return { score: isCorrect ? qScore : 0, maxScore: qScore, isCorrect };
    }

    if (qType === "true_false_group") {
      const options = question.options || [];
      const subAns = answer.sub_answers || {};
      let correctCount = 0;
      options.forEach((opt) => {
        if (subAns[opt.id] !== undefined && subAns[opt.id] === opt.is_correct) {
          correctCount += 1;
        }
      });
      const isFull = options.length > 0 && correctCount === options.length;
      return {
        score: isFull ? qScore : 0,
        maxScore: qScore,
        isCorrect: isFull,
        correctCount,
        totalCount: options.length,
      };
    }

    return { score: 0, maxScore: qScore, isCorrect: false };
  }

  calculateExamTotal(questions: QuestionEvaluationItem[]): number {
    return questions.reduce((sum, q) => sum + (q.score || 0), 0);
  }

  validateStructure(): { isValid: boolean; warnings: string[] } {
    return { isValid: true, warnings: [] };
  }
}

const STRATEGIES: Record<string, ScoringStrategy> = {
  thpt_math_2026: new THPTMath2026ScoringStrategy(),
  hsa_math_2026: new HSAMath2026ScoringStrategy(),
  standard: new StandardScoringStrategy(),
};

export function getScoringStrategy(key?: string | null): ScoringStrategy {
  if (key && STRATEGIES[key]) {
    return STRATEGIES[key] as ScoringStrategy;
  }
  return STRATEGIES.standard as ScoringStrategy;
}

