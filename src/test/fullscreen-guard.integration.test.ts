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

describe("Phase 8: Fullscreen Integrity Integration Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  const publicExamId = "40000000-0000-0000-0000-000000000002"; // fullscreen_required = true
  const service = client(serviceRoleKey);

  it("returns fullscreen_required flag in get_attempt_payload", async () => {
    await service
      .from("exam_attempts")
      .delete()
      .eq("student_id", "10000000-0000-0000-0000-000000000002")
      .eq("exam_id", publicExamId);

    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    const { data: startRes, error: startErr } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    expect(startErr).toBeNull();
    const attemptId = startRes?.[0]?.attempt_id ?? "";
    expect(attemptId).not.toBe("");

    const { data: payload, error } = await student1.rpc("get_attempt_payload", {
      p_attempt_id: attemptId,
    });

    expect(error).toBeNull();
    const payloadObj = payload as Record<string, unknown>;
    expect(payloadObj.fullscreen_required).toBe(true);
  });

  it("records violation event, enforces deduplication and handles resolution", async () => {
    await service
      .from("exam_attempts")
      .delete()
      .eq("student_id", "10000000-0000-0000-0000-000000000002")
      .eq("exam_id", publicExamId);

    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    const attemptId = startRes?.[0]?.attempt_id ?? "";

    // 1. Record first fullscreen exit event
    const { data: rec1, error: err1 } = await student1.rpc("record_exam_event", {
      p_attempt_id: attemptId,
      p_event_type: "fullscreen_exit",
    });
    expect(err1).toBeNull();
    expect(rec1?.[0]?.event_id).toBeDefined();
    expect(rec1?.[0]?.is_duplicate).toBe(false);
    const eventId1 = rec1?.[0]?.event_id;

    // 2. Immediate second exit event for same attempt -> returns existing event ID (duplicate protection!)
    const { data: rec2, error: err2 } = await student1.rpc("record_exam_event", {
      p_attempt_id: attemptId,
      p_event_type: "fullscreen_exit",
    });
    expect(err2).toBeNull();
    expect(rec2?.[0]?.event_id).toBe(eventId1);
    expect(rec2?.[0]?.is_duplicate).toBe(true);

    // 3. Resolve active violation event
    const { data: resData, error: resErr } = await student1.rpc("resolve_exam_event", {
      p_attempt_id: attemptId,
    });
    expect(resErr).toBeNull();
    expect(resData?.[0]?.success).toBe(true);
    expect(resData?.[0]?.resolved_count).toBeGreaterThanOrEqual(1);

    // 4. After resolution, a new exit event creates a distinct new event ID!
    const { data: rec3, error: err3 } = await student1.rpc("record_exam_event", {
      p_attempt_id: attemptId,
      p_event_type: "fullscreen_exit",
    });
    expect(err3).toBeNull();
    expect(rec3?.[0]?.event_id).not.toBe(eventId1);
    expect(rec3?.[0]?.is_duplicate).toBe(false);
  });

  it("enforces 5-second grace period verification on fullscreen_violation submit", async () => {
    await service
      .from("exam_attempts")
      .delete()
      .eq("student_id", "10000000-0000-0000-0000-000000000002")
      .eq("exam_id", publicExamId);

    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    // Create new attempt
    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    const attemptId = startRes?.[0]?.attempt_id ?? "";

    // 1. Trying to submit with fullscreen_violation before recording any exit event -> rejected!
    const { data: subErr1 } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_submit_reason: "fullscreen_violation",
    });
    expect(subErr1?.[0]?.success).toBe(false);
    expect(subErr1?.[0]?.code).toBe("NO_ACTIVE_VIOLATION_EVENT");

    // 2. Record exit event
    await student1.rpc("record_exam_event", {
      p_attempt_id: attemptId,
      p_event_type: "fullscreen_exit",
    });

    // 3. Submitting immediately (< 5 seconds) -> rejected with VIOLATION_GRACE_PERIOD_ACTIVE!
    const { data: subErr2 } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_submit_reason: "fullscreen_violation",
    });
    expect(subErr2?.[0]?.success).toBe(false);
    expect(subErr2?.[0]?.code).toBe("VIOLATION_GRACE_PERIOD_ACTIVE");

    // 4. Simulate > 5s elapsed by updating server_occurred_at via service role
    await service
      .from("exam_events")
      .update({ server_occurred_at: new Date(Date.now() - 6000).toISOString() })
      .eq("attempt_id", attemptId)
      .eq("event_type", "fullscreen_exit");

    // 5. Submit again -> succeeds and finalizes with auto_submitted & fullscreen_violation!
    const { data: subOk } = await student1.rpc("submit_attempt", {
      p_attempt_id: attemptId,
      p_submit_reason: "fullscreen_violation",
    });
    expect(subOk?.[0]?.success).toBe(true);
    expect(subOk?.[0]?.attempt_status).toBe("auto_submitted");
  });

  it("blocks non-owners from recording or resolving events on another attempt", async () => {
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");
    const guest = client();

    const { data: startRes } = await student1.rpc("start_attempt", { p_exam_id: publicExamId });
    const attemptId = startRes?.[0]?.attempt_id ?? "";

    // Guest tries to record event on student1's attempt -> FORBIDDEN!
    const { error: recErr } = await guest.rpc("record_exam_event", {
      p_attempt_id: attemptId,
      p_event_type: "fullscreen_exit",
    });
    expect(recErr).not.toBeNull();

    // Guest tries to resolve event on student1's attempt -> FORBIDDEN / success=false!
    const { data: resRes } = await guest.rpc("resolve_exam_event", {
      p_attempt_id: attemptId,
    });
    expect(resRes?.[0]?.success).toBe(false);
  });
});
