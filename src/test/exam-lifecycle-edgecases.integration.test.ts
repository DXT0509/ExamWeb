import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";

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

describe.sequential("Phase 11: Exam Lifecycle Edge Cases & Security Integration Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  const publicExamId = "40000000-0000-0000-0000-000000000002";
  const studentsOnlyExamId = "40000000-0000-0000-0000-000000000003";

  it("AT-CLOSE-001 -> AT-CLOSE-004: Closing exam blocks new attempts but allows in-progress attempt to autosave & submit", async () => {
    const service = client(serviceRoleKey);
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");

    // Clean up attempts for student1 on studentsOnlyExamId
    await service.from("exam_attempts").delete().eq("student_id", "10000000-0000-0000-0000-000000000002");

    // Ensure exam is published initially
    await admin.from("exams").update({ status: "published", closed_at: null }).eq("id", studentsOnlyExamId);

    // 1. Student1 starts attempt while exam is published
    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: studentsOnlyExamId });
    const attemptId = (startRes as any)?.[0]?.attempt_id;
    expect(attemptId).toBeDefined();

    // 2. Admin closes the exam
    const { error: closeErr } = await admin
      .from("exams")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", studentsOnlyExamId);
    expect(closeErr).toBeNull();

    // 3. AT-CLOSE-001: New start attempt for closed exam is blocked
    const anonGuest = client();
    const { error: blockedStartErr } = await anonGuest.rpc("start_attempt", { p_exam_id: studentsOnlyExamId });
    expect(blockedStartErr).not.toBeNull();
    expect(blockedStartErr?.message).toContain("EXAM_NOT_PUBLISHED");

    // 4. AT-CLOSE-002 & 003: Student1's in-progress attempt remains in_progress and can autosave
    const { data: payload } = await student1.rpc("get_attempt_payload", { p_attempt_id: attemptId });
    expect((payload as any).status).toBe("in_progress");

    const firstQ = (payload as any).sections[0].questions[0];
    const firstOpt = firstQ.options[0];

    const { data: saveRes } = await student1.rpc("save_answer", {
      p_attempt_id: attemptId,
      p_question_id: firstQ.id,
      p_selected_option_id: firstOpt.id,
    });
    expect(saveRes?.[0]?.success).toBe(true);

    // 5. AT-CLOSE-004: Student1 can submit normally
    const { data: submitRes } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_submit_reason: "student_submit",
    });
    expect(submitRes?.[0]?.success).toBe(true);
    expect(submitRes?.[0]?.attempt_status).toBe("submitted");

    // Reopen exam to published for subsequent tests
    await admin.from("exams").update({ status: "published", closed_at: null }).eq("id", studentsOnlyExamId);
  });

  it("AT-ANSWER-INVALID: rejects invalid question or option saving", async () => {
    const service = client(serviceRoleKey);
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    // Clean up attempts
    await service.from("exam_attempts").delete().eq("student_id", "10000000-0000-0000-0000-000000000002");

    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    const attemptId = (startRes as any)?.[0]?.attempt_id;

    // Get payload to retrieve real questions belonging to this exam
    const { data: payload } = await student1.rpc("get_attempt_payload", { p_attempt_id: attemptId });
    const realQ = (payload as any).sections[0].questions[0];

    // 1. Option belonging to a different question or fake ID
    const fakeOptId = "99999999-9999-9999-9999-999999999999";
    const { data: saveBadOpt } = await student1.rpc("save_answer", {
      p_attempt_id: attemptId,
      p_question_id: realQ.id,
      p_selected_option_id: fakeOptId,
    });
    expect(saveBadOpt?.[0]?.success).toBe(false);
    expect(saveBadOpt?.[0]?.code).toBe("INVALID_OPTION_FOR_QUESTION");

    // 2. Question belonging to another exam
    const fakeQuestionId = "88888888-8888-8888-8888-888888888888";
    const { data: saveBadQ } = await student1.rpc("save_answer", {
      p_attempt_id: attemptId,
      p_question_id: fakeQuestionId,
    });
    expect(saveBadQ?.[0]?.success).toBe(false);
    expect(saveBadQ?.[0]?.code).toBe("INVALID_QUESTION_FOR_EXAM");
  });

  it("AT-SUBMIT-004 & 005: retry submit with same or different idempotency key returns finalized score without recalculation", async () => {
    const service = client(serviceRoleKey);
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    await service.from("exam_attempts").delete().eq("student_id", "10000000-0000-0000-0000-000000000002");

    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    const attemptId = (startRes as any)?.[0]?.attempt_id;

    // 1. Initial submit with key A
    const { data: submit1 } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_idempotency_key: "key-alpha-123",
      p_submit_reason: "student_submit",
    });
    expect(submit1?.[0]?.success).toBe(true);
    expect(submit1?.[0]?.attempt_status).toBe("submitted");
    const score1 = submit1?.[0]?.score;

    // 2. Retry with same key A -> returns ALREADY_SUBMITTED and same score
    const { data: submit2 } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_idempotency_key: "key-alpha-123",
      p_submit_reason: "student_submit",
    });
    expect(submit2?.[0]?.success).toBe(true);
    expect(submit2?.[0]?.code).toBe("ALREADY_SUBMITTED");
    expect(submit2?.[0]?.score).toBe(score1);

    // 3. Retry with different key B -> returns ALREADY_SUBMITTED and same score
    const { data: submit3 } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_idempotency_key: "key-beta-456",
      p_submit_reason: "student_submit",
    });
    expect(submit3?.[0]?.success).toBe(true);
    expect(submit3?.[0]?.code).toBe("ALREADY_SUBMITTED");
    expect(submit3?.[0]?.score).toBe(score1);
  });
});
