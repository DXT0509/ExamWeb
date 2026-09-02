import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { EXAM_TEMPLATES } from "@/lib/exams/templates";
import { THPTMath2026ScoringStrategy, HSAMath2026ScoringStrategy } from "@/lib/exams/scoring-strategies";
import { evaluateMathAnswer, parseMathValue } from "@/lib/exams/math-parser";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    const key = match?.[1];
    const value = match?.[2];
    if (key && value !== undefined && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function client(key = anonKey) {
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `test-${crypto.randomUUID()}` },
  });
}

describe("PHASE 16: Real-World Exam Validation & Content Engine QA", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test.");
  }

  const adminClient = client(serviceRoleKey);
  let adminUserId: string;
  let adminEmail: string;
  let adminUserClient: ReturnType<typeof client>;
  let studentUserId: string;
  let studentEmail: string;
  const studentPassword = "Password123!";
  let studentClient: ReturnType<typeof client>;
  let subjectId: string;

  beforeAll(async () => {
    adminEmail = `admin_qa_${Date.now()}@example.com`;
    studentEmail = `student_qa_${Date.now()}@example.com`;

    const { data: adminAuth, error: aErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: "Password123!",
      email_confirm: true,
    });
    expect(aErr).toBeNull();
    adminUserId = adminAuth.user!.id;
    await adminClient.from("profiles").upsert({
      id: adminUserId,
      display_name: "Admin QA",
      role: "admin",
      status: "active",
    });

    adminUserClient = client(anonKey);
    const { error: adminSignInErr } = await adminUserClient.auth.signInWithPassword({
      email: adminEmail,
      password: "Password123!",
    });
    expect(adminSignInErr).toBeNull();

    const { data: studentAuth, error: sErr } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
    });
    expect(sErr).toBeNull();
    studentUserId = studentAuth.user!.id;
    await adminClient.from("profiles").upsert({
      id: studentUserId,
      display_name: "Học sinh QA",
      role: "student",
      status: "active",
    });

    studentClient = client(anonKey);
    const { error: signInErr } = await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });
    expect(signInErr).toBeNull();

    // Seeded Math Subject ID
    subjectId = "20000000-0000-0000-0000-000000000001";
  });

  afterAll(async () => {
    if (adminUserId) await adminClient.auth.admin.deleteUser(adminUserId);
    if (studentUserId) await adminClient.auth.admin.deleteUser(studentUserId);
  });

  describe("1. Mathematical Answer Evaluation & Parser QA", () => {
    it("handles equivalent fractions and decimals: 0.5, 0,5, 1/2, 2/4", () => {
      expect(parseMathValue("0.5")).toBe(0.5);
      expect(parseMathValue("0,5")).toBe(0.5);
      expect(parseMathValue("1/2")).toBe(0.5);
      expect(parseMathValue("2/4")).toBe(0.5);
      expect(parseMathValue(" 1 / 2 ")).toBe(0.5);

      expect(evaluateMathAnswer("0.5", "1/2")).toBe(true);
      expect(evaluateMathAnswer("0,5", "1/2")).toBe(true);
      expect(evaluateMathAnswer("2/4", "1/2")).toBe(true);
      expect(evaluateMathAnswer("1/2", "0.5")).toBe(true);
    });

    it("handles negative numbers and fractions: -0.75, -3/4", () => {
      expect(parseMathValue("-0.75")).toBe(-0.75);
      expect(parseMathValue("-3/4")).toBe(-0.75);
      expect(parseMathValue("- 3 / 4")).toBe(-0.75);

      expect(evaluateMathAnswer("-0.75", "-3/4")).toBe(true);
      expect(evaluateMathAnswer("-3/4", "-0.75")).toBe(true);
      expect(evaluateMathAnswer("-0,75", "-3/4")).toBe(true);
    });

    it("handles integers and zero", () => {
      expect(parseMathValue("0")).toBe(0);
      expect(parseMathValue("12")).toBe(12);
      expect(parseMathValue("-5")).toBe(-5);

      expect(evaluateMathAnswer("12", "12")).toBe(true);
      expect(evaluateMathAnswer("-5", "-5")).toBe(true);
      expect(evaluateMathAnswer("0", "0")).toBe(true);
    });

    it("handles tolerance for irrational approximations e.g. √2 ≈ 1.4142", () => {
      expect(evaluateMathAnswer("1.414", "1.4142", 0.001)).toBe(true);
      expect(evaluateMathAnswer("1.410", "1.4142", 0.001)).toBe(false);
    });
  });

  describe("2. THPT 2026 Scoring Strategy & Rules", () => {
    const strategy = new THPTMath2026ScoringStrategy();

    it("evaluates Part I (Multiple Choice, 0.25 pt each)", () => {
      const q = {
        id: "q1",
        question_type: "multiple_choice",
        score: 0.25,
        options: [
          { id: "opt1", is_correct: true },
          { id: "opt2", is_correct: false },
        ],
      };

      const resCorrect = strategy.evaluateQuestion(q, { question_id: "q1", selected_option_id: "opt1" });
      expect(resCorrect.score).toBe(0.25);
      expect(resCorrect.isCorrect).toBe(true);

      const resWrong = strategy.evaluateQuestion(q, { question_id: "q1", selected_option_id: "opt2" });
      expect(resWrong.score).toBe(0);
      expect(resWrong.isCorrect).toBe(false);

      const resBlank = strategy.evaluateQuestion(q, { question_id: "q1", selected_option_id: null });
      expect(resBlank.score).toBe(0);
      expect(resBlank.isCorrect).toBe(false);
    });

    it("evaluates Part II (True/False 4-statement group) for all 5 point tiers", () => {
      const q = {
        id: "q_tf",
        question_type: "true_false_group",
        score: 1.0,
        options: [
          { id: "a", is_correct: true },
          { id: "b", is_correct: false },
          { id: "c", is_correct: true },
          { id: "d", is_correct: false },
        ],
      };

      // 0 correct -> 0.00 pt
      const res0 = strategy.evaluateQuestion(q, {
        question_id: "q_tf",
        sub_answers: { a: false, b: true, c: false, d: true },
      });
      expect(res0.score).toBe(0.00);
      expect(res0.correctCount).toBe(0);

      // exactly 1 correct -> 0.10 pt
      const res1 = strategy.evaluateQuestion(q, {
        question_id: "q_tf",
        sub_answers: { a: true, b: true, c: false, d: true },
      });
      expect(res1.score).toBe(0.10);
      expect(res1.correctCount).toBe(1);

      // exactly 2 correct -> 0.25 pt
      const res2 = strategy.evaluateQuestion(q, {
        question_id: "q_tf",
        sub_answers: { a: true, b: false, c: false, d: true },
      });
      expect(res2.score).toBe(0.25);
      expect(res2.correctCount).toBe(2);

      // exactly 3 correct -> 0.50 pt
      const res3 = strategy.evaluateQuestion(q, {
        question_id: "q_tf",
        sub_answers: { a: true, b: false, c: true, d: true },
      });
      expect(res3.score).toBe(0.50);
      expect(res3.correctCount).toBe(3);

      // all 4 correct -> 1.00 pt
      const res4 = strategy.evaluateQuestion(q, {
        question_id: "q_tf",
        sub_answers: { a: true, b: false, c: true, d: false },
      });
      expect(res4.score).toBe(1.00);
      expect(res4.correctCount).toBe(4);
      expect(res4.isCorrect).toBe(true);
    });

    it("evaluates Part III (Short Answer, 0.5 pt each)", () => {
      const q = {
        id: "q_short",
        question_type: "short_answer",
        score: 0.5,
        correct_answer_raw: "1/2",
        tolerance: 0,
      };

      const resFrac = strategy.evaluateQuestion(q, { question_id: "q_short", text_answer: "1/2" });
      expect(resFrac.score).toBe(0.5);
      expect(resFrac.isCorrect).toBe(true);

      const resDec = strategy.evaluateQuestion(q, { question_id: "q_short", text_answer: "0,5" });
      expect(resDec.score).toBe(0.5);
      expect(resDec.isCorrect).toBe(true);

      const resWrong = strategy.evaluateQuestion(q, { question_id: "q_short", text_answer: "0.75" });
      expect(resWrong.score).toBe(0);
      expect(resWrong.isCorrect).toBe(false);
    });
  });

  describe("3. Real-World End-to-End THPT 2026 Exam Lifecycle & DB Scoring Verification", () => {
    let examId: string;
    let sectionId: string;
    const questionIds: string[] = [];
    const optionIdsByQuestion: Record<string, string[]> = {};

    it("scaffolds and publishes a complete THPT 2026 Exam in Database", async () => {
      const { data: exam, error: examErr } = await adminClient
        .from("exams")
        .insert({
          title: "Đề thi thử Tốt nghiệp THPT 2026 — Môn Toán (Real QA)",
          slug: `thpt-toan-qa-${Date.now()}`,
          subject_id: subjectId,
          duration_minutes: 90,
          total_score: 10,
          status: "draft",
          access_type: "public",
          allow_guest_attempt: true,
          fullscreen_required: false,
          show_score_after_submit: true,
          show_answers_after_submit: true,
          show_solutions_after_submit: true,
          exam_template: "thpt_math_2026",
          scoring_strategy: "thpt_math_2026",
          created_by: adminUserId,
        })
        .select()
        .single();

      expect(examErr).toBeNull();
      expect(exam).toBeDefined();
      examId = exam.id;

      const { data: section, error: secErr } = await adminClient
        .from("exam_sections")
        .insert({
          exam_id: examId,
          title: "Đề thi chính thức",
          position: 1,
        })
        .select()
        .single();
      expect(secErr).toBeNull();
      sectionId = section.id;

      const template = EXAM_TEMPLATES.thpt_math_2026!;
      const scaffolded = template.generateQuestions();
      expect(scaffolded.length).toBe(22);

      for (const sq of scaffolded) {
        const { data: qRecord, error: qErr } = await adminClient
          .from("questions")
          .insert({
            section_id: sectionId,
            content: `Câu hỏi số ${sq.position} [QA Content: f(x) = x^2 + 2x - 1]`,
            question_type: sq.question_type,
            score: sq.score,
            position: sq.position,
            correct_answer_raw: sq.question_type === "short_answer" ? "1/2" : null,
            tolerance: sq.tolerance,
            explanation: `Lời giải chi tiết câu ${sq.position}`,
          })
          .select()
          .single();

        expect(qErr).toBeNull();
        questionIds.push(qRecord.id);

        if (sq.options.length > 0) {
          const optsToInsert = sq.options.map((opt, oIdx) => ({
            question_id: qRecord.id,
            content: sq.question_type === "true_false_group"
              ? `Khẳng định ${["a", "b", "c", "d"][oIdx]}: Đồ thị hàm số có tiệm cận.`
              : `Lựa chọn ${String.fromCharCode(65 + oIdx)}`,
            position: opt.position,
            is_correct: opt.is_correct,
          }));

          const { data: insertedOpts, error: optErr } = await adminClient
            .from("question_options")
            .insert(optsToInsert)
            .select();

          expect(optErr).toBeNull();
          optionIdsByQuestion[qRecord.id] = (insertedOpts || []).map((o: { id: string }) => o.id);
        }
      }

      expect(questionIds.length).toBe(22);

      // Publish the exam via Admin RPC
      const { data: pubRes, error: pubErr } = await adminUserClient.rpc("publish_exam", {
        exam_id: examId,
      });
      expect(pubErr).toBeNull();
      expect(pubRes[0].success).toBe(true);
    });

    it("Student takes exam, saves all answer types, and submits with exact scoring verification", async () => {
      // 1. Start Attempt by Student
      const { data: startRes, error: startErr } = await studentClient.rpc("start_attempt", {
        p_exam_id: examId,
        p_guest_session_hash: null,
      });

      expect(startErr).toBeNull();
      const attemptId = startRes[0].attempt_id;
      expect(attemptId).toBeDefined();

      // 2. Student answers:
      // - 12 MCQs: 10 correct (+2.50), 2 wrong
      for (let i = 0; i < 12; i++) {
        const qId = questionIds[i]!;
        const optIds = optionIdsByQuestion[qId]!;
        const selectedOpt = i < 10 ? optIds[0] : optIds[1];

        const { data: saveRes, error: saveErr } = await studentClient.rpc("save_answer", {
          p_attempt_id: attemptId,
          p_question_id: qId,
          p_selected_option_id: selectedOpt,
        });
        expect(saveErr).toBeNull();
        expect(saveRes![0]!.success).toBe(true);
      }

      // - 4 True/False groups:
      // q13 (index 12): 4 correct -> +1.00
      const q13Opts = optionIdsByQuestion[questionIds[12]!]!;
      const { data: s13, error: e13 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[12]!,
        p_sub_answers: {
          [q13Opts[0]!]: true,
          [q13Opts[1]!]: false,
          [q13Opts[2]!]: true,
          [q13Opts[3]!]: false,
        },
      });
      expect(e13).toBeNull();
      expect(s13![0]!.success).toBe(true);

      // q14 (index 13): 3 correct -> +0.50
      const q14Opts = optionIdsByQuestion[questionIds[13]!]!;
      const { data: s14, error: e14 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[13]!,
        p_sub_answers: {
          [q14Opts[0]!]: true,
          [q14Opts[1]!]: false,
          [q14Opts[2]!]: true,
          [q14Opts[3]!]: true,
        },
      });
      expect(e14).toBeNull();
      expect(s14![0]!.success).toBe(true);

      // q15 (index 14): 2 correct -> +0.25
      const q15Opts = optionIdsByQuestion[questionIds[14]!]!;
      const { data: s15, error: e15 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[14]!,
        p_sub_answers: {
          [q15Opts[0]!]: true,
          [q15Opts[1]!]: false,
          [q15Opts[2]!]: false,
          [q15Opts[3]!]: true,
        },
      });
      expect(e15).toBeNull();
      expect(s15![0]!.success).toBe(true);

      // q16 (index 15): 1 correct -> +0.10
      const q16Opts = optionIdsByQuestion[questionIds[15]!]!;
      const { data: s16, error: e16 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[15]!,
        p_sub_answers: {
          [q16Opts[0]!]: true,
          [q16Opts[1]!]: true,
          [q16Opts[2]!]: false,
          [q16Opts[3]!]: true,
        },
      });
      expect(e16).toBeNull();
      expect(s16![0]!.success).toBe(true);

      // - 6 Short Answers:
      // q17: "0.5" -> Correct (+0.5)
      const { data: s17, error: e17 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[16]!,
        p_text_answer: "0.5",
      });
      expect(e17).toBeNull();
      expect(s17![0]!.success).toBe(true);

      // q18: "0,5" -> Correct (+0.5)
      const { data: s18, error: e18 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[17]!,
        p_text_answer: "0,5",
      });
      expect(e18).toBeNull();
      expect(s18![0]!.success).toBe(true);

      // q19: "2/4" -> Correct (+0.5)
      const { data: s19, error: e19 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[18]!,
        p_text_answer: "2/4",
      });
      expect(e19).toBeNull();
      expect(s19![0]!.success).toBe(true);

      // q20: " 1 / 2 " -> Correct (+0.5)
      const { data: s20, error: e20 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[19]!,
        p_text_answer: " 1 / 2 ",
      });
      expect(e20).toBeNull();
      expect(s20![0]!.success).toBe(true);

      // q21: "0.75" -> Wrong (+0.0)
      const { data: s21, error: e21 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[20]!,
        p_text_answer: "0.75",
      });
      expect(e21).toBeNull();
      expect(s21![0]!.success).toBe(true);

      // q22: "" -> Blank (+0.0)
      const { data: s22, error: e22 } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[21]!,
        p_text_answer: "",
      });
      expect(e22).toBeNull();
      expect(s22![0]!.success).toBe(true);

      // TOTAL EXPECTED = 2.50 + 1.85 + 2.00 = 6.35 pts.

      // 3. Submit Attempt
      const { data: submitRes, error: submitErr } = await studentClient.rpc("submit_attempt", {
        p_attempt_id: attemptId,
        p_submit_reason: "student_submit",
      });

      expect(submitErr).toBeNull();
      const finalResult = submitRes[0];
      expect(finalResult.success).toBe(true);
      expect(finalResult.attempt_status).toBe("submitted");
      expect(Number(finalResult.score)).toBe(6.35);
      expect(Number(finalResult.max_score)).toBe(10);

      // 4. Verify Student Result RPC
      const { data: studentResult, error: resErr } = await studentClient.rpc("get_attempt_result", {
        p_attempt_id: attemptId,
      });

      expect(resErr).toBeNull();
      expect(studentResult).toBeDefined();
      expect(Number(studentResult.score)).toBe(6.35);
      expect(studentResult.questions_detail.length).toBe(22);

      // 5. Admin Attempt Detail RPC
      const { data: adminDetail, error: adminDetailErr } = await adminUserClient.rpc("get_admin_attempt_detail", {
        p_attempt_id: attemptId,
      });

      expect(adminDetailErr).toBeNull();
      expect(adminDetail).toBeDefined();
      expect(Number(adminDetail.score)).toBe(6.35);
      expect(adminDetail.questions_detail.length).toBe(22);

      // 6. Security Check: Double submit idempotency
      const { data: doubleSubmit } = await studentClient.rpc("submit_attempt", {
        p_attempt_id: attemptId,
      });
      expect(doubleSubmit[0].code).toBe("ALREADY_SUBMITTED");
      expect(Number(doubleSubmit[0].score)).toBe(6.35);

      // 7. Security Check: Modify after submit rejected
      const { data: saveAfterSubmit } = await studentClient.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionIds[0],
        p_text_answer: "123",
      });
      expect(saveAfterSubmit[0].success).toBe(false);
      expect(saveAfterSubmit[0].code).toBe("ATTEMPT_ALREADY_FINALIZED");
    });
  });

  describe("4. Real-World HSA 2026 Template Validation", () => {
    it("verifies 50 questions (35 MCQ + 15 Short Answer) with total score 50 and 75 minutes duration", () => {
      const hsaTemplate = EXAM_TEMPLATES.hsa_math_2026!;
      expect(hsaTemplate).toBeDefined();
      expect(hsaTemplate.defaultDurationMinutes).toBe(75);
      expect(hsaTemplate.defaultTotalScore).toBe(50);

      const questions = hsaTemplate.generateQuestions();
      expect(questions.length).toBe(50);

      const mcqs = questions.filter((q) => q.question_type === "multiple_choice");
      const shorts = questions.filter((q) => q.question_type === "short_answer");

      expect(mcqs.length).toBe(35);
      expect(shorts.length).toBe(15);
      expect(mcqs.every((q) => q.score === 1.0)).toBe(true);
      expect(shorts.every((q) => q.score === 1.0)).toBe(true);

      const strategy = new HSAMath2026ScoringStrategy();
      const validation = strategy.validateStructure(
        questions.map((q, idx) => ({
          id: `q${idx}`,
          question_type: q.question_type,
          score: q.score,
        }))
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBe(0);
    });
  });
});
