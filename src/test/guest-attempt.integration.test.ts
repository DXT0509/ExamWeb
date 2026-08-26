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

describe.sequential("Phase 11: Guest Attempt Complete Lifecycle & Security Integration Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  const publicGuestExamId = "40000000-0000-0000-0000-000000000002"; // allow_guest_attempt = true
  const studentsOnlyExamId = "40000000-0000-0000-0000-000000000003"; // allow_guest_attempt = false

  it("AT-GUEST-001: executes full guest attempt flow (start, payload, autosave, submit, result)", async () => {
    const guest = client();
    const rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const guestHash = hashGuestToken(rawToken);

    // 1. Start guest attempt
    const { data: startData, error: startErr } = await guest.rpc("start_attempt", {
      p_exam_id: publicGuestExamId,
      p_guest_session_hash: guestHash,
    });
    expect(startErr).toBeNull();
    expect(startData).toHaveLength(1);
    const attemptId = (startData as any)?.[0]?.attempt_id;
    expect(attemptId).toBeDefined();

    // 2. Get payload - ensure is_correct is not leaked
    const { data: payloadData, error: payloadErr } = await guest.rpc("get_attempt_payload", {
      p_attempt_id: attemptId,
      p_guest_session_hash: guestHash,
    });
    expect(payloadErr).toBeNull();
    const payloadStr = JSON.stringify(payloadData);
    expect(payloadStr).not.toContain("is_correct");
    expect(payloadStr).not.toContain("explanation");

    // Extract first question and its first option
    const sections = (payloadData as any).sections;
    expect(sections.length).toBeGreaterThan(0);
    const firstQ = sections[0].questions[0];
    const firstOpt = firstQ.options[0];

    // 3. Autosave answer
    const { data: saveRes, error: saveErr } = await guest.rpc("save_answer", {
      p_attempt_id: attemptId,
      p_question_id: firstQ.id,
      p_selected_option_id: firstOpt.id,
      p_is_marked: true,
      p_guest_session_hash: guestHash,
    });
    expect(saveErr).toBeNull();
    expect(saveRes?.[0]?.success).toBe(true);

    // 4. Submit attempt
    const { data: submitRes, error: submitErr } = await guest.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_guest_session_hash: guestHash,
      p_submit_reason: "student_submit",
    });
    expect(submitErr).toBeNull();
    expect(submitRes?.[0]?.success).toBe(true);
    expect(submitRes?.[0]?.attempt_status).toBe("submitted");

    // 5. Get attempt result - verify is_guest is true
    const { data: resultData, error: resultErr } = await guest.rpc("get_attempt_result", {
      p_attempt_id: attemptId,
      p_guest_session_hash: guestHash,
    });
    expect(resultErr).toBeNull();
    expect((resultData as any).is_guest).toBe(true);
    expect((resultData as any).status).toBe("submitted");
  });

  it("AT-GUEST-002: rejects guest from starting exam when allow_guest_attempt = false", async () => {
    const guest = client();
    const rawToken = "1111111111111111111111111111111111111111111111111111111111111111";
    const guestHash = hashGuestToken(rawToken);

    const { error } = await guest.rpc("start_attempt", {
      p_exam_id: studentsOnlyExamId,
      p_guest_session_hash: guestHash,
    });
    expect(error).not.toBeNull();
    expect(["LOGIN_REQUIRED", "GUEST_ATTEMPT_NOT_ALLOWED"]).toContain(error?.message);
  });

  it("AT-ATTEMPT-004: concurrent start attempt from same guest session returns existing active attempt", async () => {
    const guest = client();
    const rawToken = "2222222222222222222222222222222222222222222222222222222222222222";
    const guestHash = hashGuestToken(rawToken);

    // Clean up any existing attempt for this hash
    const service = client(serviceRoleKey);
    await service.from("exam_attempts").delete().eq("guest_session_hash", guestHash);

    // Start 1st
    const { data: start1 } = await guest.rpc("start_attempt", {
      p_exam_id: publicGuestExamId,
      p_guest_session_hash: guestHash,
    });
    expect(start1?.[0]?.is_existing).toBe(false);
    const attemptId1 = start1?.[0]?.attempt_id;

    // Start 2nd with same guest token hash -> returns existing
    const { data: start2 } = await guest.rpc("start_attempt", {
      p_exam_id: publicGuestExamId,
      p_guest_session_hash: guestHash,
    });
    expect(start2?.[0]?.is_existing).toBe(true);
    expect(start2?.[0]?.attempt_id).toBe(attemptId1);
  });

  it("AT-RLS-003 & AC-RBAC-008: blocks Guest B from reading or tampering Guest A attempt", async () => {
    const guestA = client();
    const tokenA = "3333333333333333333333333333333333333333333333333333333333333333";
    const hashA = hashGuestToken(tokenA);

    const tokenB = "4444444444444444444444444444444444444444444444444444444444444444";
    const hashB = hashGuestToken(tokenB);

    // Guest A starts attempt
    const { data: startA } = await guestA.rpc("start_attempt", {
      p_exam_id: publicGuestExamId,
      p_guest_session_hash: hashA,
    });
    const attemptIdA = (startA as any)?.[0]?.attempt_id;

    // Guest B tries to get Guest A payload -> FORBIDDEN
    const guestB = client();
    const { error: readErr } = await guestB.rpc("get_attempt_payload", {
      p_attempt_id: attemptIdA,
      p_guest_session_hash: hashB,
    });
    expect(readErr).not.toBeNull();
    expect(readErr?.message).toContain("FORBIDDEN_ATTEMPT_ACCESS");

    // Guest B without session hash tries to get Guest A payload -> FORBIDDEN
    const { error: noHashErr } = await guestB.rpc("get_attempt_payload", {
      p_attempt_id: attemptIdA,
    });
    expect(noHashErr).not.toBeNull();
    expect(noHashErr?.message).toContain("FORBIDDEN_ATTEMPT_ACCESS");
  });
});
