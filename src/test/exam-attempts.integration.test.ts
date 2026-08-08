import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { hashGuestToken } from "@/lib/exams/guest-session";

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
  return createClient<Database>(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `test-${crypto.randomUUID()}` },
  });
}

async function signedIn(email: string, password: string) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return supabase;
}

describe("Phase 7: Exam Engine Core Integration Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  // IDs matching supabase/seed.sql
  const publicExamId = "40000000-0000-0000-0000-000000000002"; // allow_guest_attempt = true
  const studentsOnlyExamId = "40000000-0000-0000-0000-000000000003"; // allow_guest_attempt = false
  const draftExamId = "40000000-0000-0000-0000-000000000001"; // draft exam

  it("allows Student and Guest to start attempts, and blocks invalid start requests", async () => {
    const service = client(serviceRoleKey);
    await service
      .from("exam_attempts")
      .delete()
      .eq("student_id", "10000000-0000-0000-0000-000000000002");

    const student1 = await signedIn("student1@example.test", "LocalStudent123!");
    const guest = client();

    // 1. Student1 starts public exam
    const { data: start1, error: err1 } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    expect(err1).toBeNull();
    const row1 = start1?.[0];
    expect(row1?.attempt_id).toBeDefined();
    expect(row1?.attempt_status).toBe("in_progress");
    expect(row1?.is_existing).toBe(false);

    // 2. Double start attempt by Student1 -> returns existing active attempt!
    const { data: start1Retry, error: err1Retry } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    expect(err1Retry).toBeNull();
    const row1Retry = start1Retry?.[0];
    expect(row1Retry?.attempt_id).toBe(row1?.attempt_id);
    expect(row1Retry?.is_existing).toBe(true);

    // 3. Guest starts public exam with valid guest token hash
    const rawToken = "1111111111111111111111111111111111111111111111111111111111111111";
    const guestHash = hashGuestToken(rawToken);
    const { data: guestStart, error: guestErr } = await guest.rpc("start_attempt", {
      p_exam_id: publicExamId,
      p_guest_session_hash: guestHash,
    });
    expect(guestErr).toBeNull();
    expect(guestStart?.[0]?.attempt_id).toBeDefined();

    // 4. Guest starts students_only exam -> rejected (GUEST_ATTEMPT_NOT_ALLOWED)
    const { error: guestBlockedErr } = await guest.rpc("start_attempt", {
      p_exam_id: studentsOnlyExamId,
      p_guest_session_hash: guestHash,
    });
    expect(guestBlockedErr).not.toBeNull();

    // 5. Student starts draft exam -> rejected (EXAM_NOT_PUBLISHED)
    const { error: draftErr } = await student1.rpc("start_attempt", { p_exam_id: draftExamId });
    expect(draftErr).not.toBeNull();
  });

  it("hides is_correct and explanation during attempt in_progress payload", async () => {
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: studentsOnlyExamId });
    const attemptId = startRes?.[0]?.attempt_id;
    expect(attemptId).toBeDefined();

    const { data: payload, error: payloadErr } = await student1.rpc("get_attempt_payload", {
      p_attempt_id: attemptId!,
    });
    expect(payloadErr).toBeNull();

    const payloadString = JSON.stringify(payload);
    expect(payloadString).not.toContain("is_correct");
    expect(payloadString).not.toContain("explanation");
    expect(payloadString).toContain("sections");
    expect(payloadString).toContain("questions");
  });

  it("handles answer saving and validates ownership and invalid options", async () => {
    const service = client(serviceRoleKey);
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    // Create a temporary second student user for testing cross-user access
    const tempEmail = `tempstudent-${crypto.randomUUID().slice(0, 6)}@example.test`;
    const { data: tempUser, error: tempUserErr } = await service.auth.admin.createUser({
      email: tempEmail,
      password: "LocalStudent123!",
      email_confirm: true,
      user_metadata: { display_name: "Temp Student" },
    });
    expect(tempUserErr).toBeNull();
    await service.from("profiles").insert({
      id: tempUser.user!.id,
      role: "student",
      status: "active",
      display_name: "Temp Student",
    });

    const student2 = await signedIn(tempEmail, "LocalStudent123!");

    // Get attempt for student1
    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    const attemptId1 = startRes?.[0]?.attempt_id ?? "";

    // Find a valid question and option
    const { data: questions } = await service
      .from("questions")
      .select("id, section_id")
      .limit(1);
    const questionId = questions?.[0]?.id ?? "";

    const { data: options } = await service
      .from("question_options")
      .select("id")
      .eq("question_id", questionId)
      .limit(2);
    const validOptionId = options?.[0]?.id ?? "";
    const invalidOptionId = "99999999-9999-9999-9999-999999999999";

    // 1. Student1 saves answer successfully
    const { data: saveRes1, error: saveErr1 } = await student1.rpc("save_answer", {
      p_attempt_id: attemptId1,
      p_question_id: questionId,
      p_selected_option_id: validOptionId,
    });
    expect(saveErr1).toBeNull();
    expect(saveRes1?.[0]?.success).toBe(true);

    // 2. Student1 marks question
    const { data: saveRes2 } = await student1.rpc("save_answer", {
      p_attempt_id: attemptId1,
      p_question_id: questionId,
      p_selected_option_id: validOptionId,
      p_is_marked: true,
    });
    expect(saveRes2?.[0]?.success).toBe(true);

    // 3. Student2 tries to save answer for Student1's attempt -> FORBIDDEN!
    const { data: saveRes3 } = await student2.rpc("save_answer", {
      p_attempt_id: attemptId1,
      p_question_id: questionId,
      p_selected_option_id: validOptionId,
    });
    expect(saveRes3?.[0]?.success).toBe(false);
    expect(saveRes3?.[0]?.code).toBe("FORBIDDEN_ATTEMPT_ACCESS");

    // 4. Invalid option id for question -> INVALID_OPTION_FOR_QUESTION
    const { data: saveRes4 } = await student1.rpc("save_answer", {
      p_attempt_id: attemptId1,
      p_question_id: questionId,
      p_selected_option_id: invalidOptionId,
    });
    expect(saveRes4?.[0]?.success).toBe(false);
    expect(saveRes4?.[0]?.code).toBe("INVALID_OPTION_FOR_QUESTION");
  });

  it("executes server-side scoring, enforces submit idempotency and blocks edits post-submit", async () => {
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");
    const service = client(serviceRoleKey);

    // Get active attempt for student1
    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    const attemptId = startRes?.[0]?.attempt_id ?? "";

    // Fetch correct question options
    const { data: qOpts } = await service
      .from("question_options")
      .select("id, question_id, is_correct")
      .eq("is_correct", true);

    const firstQuestion = qOpts?.[0];
    if (firstQuestion) {
      await student1.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: firstQuestion.question_id,
        p_selected_option_id: firstQuestion.id,
      });
    }

    // Submit attempt manually
    const idempotencyKey = `key-${crypto.randomUUID()}`;
    const { data: submitRes, error: submitErr } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_idempotency_key: idempotencyKey,
      p_submit_reason: "student_submit",
    });

    expect(submitErr).toBeNull();
    const row = submitRes?.[0];
    expect(row?.success).toBe(true);
    expect(row?.attempt_status).toBe("submitted");
    expect(row?.score).toBeGreaterThanOrEqual(1);

    // Calling submit again returns same finalized result
    const { data: reSubmitRes } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_idempotency_key: "different-key",
      p_submit_reason: "student_submit",
    });
    expect(reSubmitRes?.[0]?.code).toBe("ALREADY_SUBMITTED");
    expect(reSubmitRes?.[0]?.score).toBe(row?.score);

    // Trying to save answer after submit -> rejected!
    if (firstQuestion) {
      const { data: lateSave } = await student1.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: firstQuestion.question_id,
        p_selected_option_id: firstQuestion.id,
      });
      expect(lateSave?.[0]?.success).toBe(false);
      expect(lateSave?.[0]?.code).toBe("ATTEMPT_ALREADY_FINALIZED");
    }

    // Fetch result
    const { data: resultData, error: resultErr } = await student1.rpc("get_attempt_result", {
      p_attempt_id: attemptId,
    });
    expect(resultErr).toBeNull();
    const resObj = resultData as Record<string, unknown>;
    expect(resObj?.status).toBe("submitted");
    expect(resObj?.score).toBe(row?.score);
  });
});
