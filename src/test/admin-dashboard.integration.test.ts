import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
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

describe("Phase 10 Step 3: Admin Dashboard Real Data & Overview Integration Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  let adminUserId: string;
  let adminEmail: string;
  let studentUserId: string;
  let studentEmail: string;
  let examId: string;
  let subjectId: string;
  let attemptId: string;

  beforeAll(async () => {
    const adminSupabase = client(serviceRoleKey);

    // 1. Create unique Admin user
    adminEmail = `admin_dash_${crypto.randomUUID().slice(0, 8)}@example.test`;
    const { data: adminAuth, error: adminErr } = await adminSupabase.auth.admin.createUser({
      email: adminEmail,
      password: "LocalAdmin123!",
      email_confirm: true,
      user_metadata: { role: "admin", display_name: "Admin Dashboard Tester" },
    });
    if (adminErr || !adminAuth.user) {
      throw adminErr || new Error("Failed to create admin test user");
    }
    adminUserId = adminAuth.user.id;

    await adminSupabase
      .from("profiles")
      .upsert({ id: adminUserId, display_name: "Admin Dashboard Tester", role: "admin", status: "active" });

    // 2. Create Student user
    studentEmail = `student_dash_${crypto.randomUUID().slice(0, 8)}@example.test`;
    const { data: studentAuth, error: studentCreateErr } = await adminSupabase.auth.admin.createUser({
      email: studentEmail,
      password: "Student123!",
      email_confirm: true,
      user_metadata: { role: "student", display_name: "Học sinh Dashboard Test" },
    });
    if (studentCreateErr || !studentAuth.user) {
      throw studentCreateErr || new Error("Failed to create student test user");
    }
    studentUserId = studentAuth.user.id;

    // 3. Use existing THPT subject & create test exam
    const { data: existingSub } = await adminSupabase
      .from("subjects")
      .select("id")
      .eq("slug", "toan-hoc")
      .single();
    subjectId = existingSub?.id ?? "20000000-0000-0000-0000-000000000001";

    const examSlug = `exam-dash-${crypto.randomUUID().slice(0, 8)}`;
    const { data: examData, error: examErr } = await adminSupabase
      .from("exams")
      .insert({
        title: "Đề thi kiểm thử Dashboard Admin",
        slug: examSlug,
        subject_id: subjectId,
        duration_minutes: 45,
        status: "published",
        published_at: new Date().toISOString(),
        created_by: adminUserId,
        updated_by: adminUserId,
      })
      .select()
      .single();
    if (examErr || !examData) throw examErr || new Error("Failed to create test exam");
    examId = examData.id;

    // 4. Create an attempt and events
    const { data: attData, error: attErr } = await adminSupabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        student_id: studentUserId,
        status: "submitted",
        score: 9.0,
        max_score: 10.0,
        started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
        submit_reason: "student_submit",
        finalized_at: new Date().toISOString(),
        deadline_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    if (attErr || !attData) throw attErr || new Error("Failed to create test attempt");
    attemptId = attData.id;

    // Log events
    await adminSupabase.from("exam_events").insert([
      {
        attempt_id: attemptId,
        event_type: "attempt_started",
        server_occurred_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        metadata: { client: "dashboard-test" },
      },
      {
        attempt_id: attemptId,
        event_type: "fullscreen_exit",
        server_occurred_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        metadata: { reason: "window_blur" },
      },
      {
        attempt_id: attemptId,
        event_type: "submit_completed",
        server_occurred_at: new Date().toISOString(),
        metadata: { score: 9.0 },
      },
    ]);
  });

  it("admin can fetch dashboard statistics with accurate counts", async () => {
    const adminSupabase = client();
    const { data: loginData, error: loginErr } = await adminSupabase.auth.signInWithPassword({
      email: adminEmail,
      password: "LocalAdmin123!",
    });
    expect(loginErr).toBeNull();
    expect(loginData.session).toBeDefined();

    const { data, error } = await adminSupabase.rpc("get_admin_dashboard_stats");

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const stats = data as {
      students: { total: number; active: number; locked: number };
      subjects: { total: number };
      exams: { total: number; published: number; draft: number; closed: number; archived: number };
      attempts: { total: number; submitted: number; auto_submitted: number; completed: number; in_progress: number; expired: number };
    };

    expect(stats.students.total).toBeGreaterThanOrEqual(1);
    expect(stats.students.active).toBeGreaterThanOrEqual(1);
    expect(stats.subjects.total).toBeGreaterThanOrEqual(1);
    expect(stats.exams.total).toBeGreaterThanOrEqual(1);
    expect(stats.exams.published).toBeGreaterThanOrEqual(1);
    expect(stats.attempts.total).toBeGreaterThanOrEqual(1);
    expect(stats.attempts.submitted).toBeGreaterThanOrEqual(1);
    expect(stats.attempts.completed).toBeGreaterThanOrEqual(1);
  });

  it("admin can fetch recent dashboard events with joined exam and student info", async () => {
    const adminSupabase = client();
    await adminSupabase.auth.signInWithPassword({
      email: adminEmail,
      password: "LocalAdmin123!",
    });

    const { data, error } = await adminSupabase.rpc("get_admin_dashboard_events", {
      p_limit: 10,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThanOrEqual(1);

    const dataArray = data!;
    const latestEvent = dataArray[0]!;
    expect(latestEvent.event_id).toBeDefined();
    expect(latestEvent.attempt_id).toBeDefined();
    expect(latestEvent.event_type).toBeDefined();
    expect(latestEvent.server_occurred_at).toBeDefined();
    expect(latestEvent.exam_title).toBeDefined();
    expect(latestEvent.subject_name).toBeDefined();

    // Verify events are sorted descending by server_occurred_at
    if (dataArray.length > 1) {
      for (let i = 0; i < dataArray.length - 1; i++) {
        const t1 = new Date(dataArray[i]!.server_occurred_at).getTime();
        const t2 = new Date(dataArray[i + 1]!.server_occurred_at).getTime();
        expect(t1).toBeGreaterThanOrEqual(t2);
      }
    }
  });

  it("student is forbidden from accessing dashboard RPCs", async () => {
    const studentSupabase = client();
    const { data: loginData, error: loginErr } = await studentSupabase.auth.signInWithPassword({
      email: studentEmail,
      password: "Student123!",
    });
    expect(loginErr).toBeNull();
    expect(loginData.session).toBeDefined();

    // 1. Stats RPC
    const statsRes = await studentSupabase.rpc("get_admin_dashboard_stats");
    expect(statsRes.error).toBeDefined();
    expect(statsRes.error?.message).toContain("FORBIDDEN_ADMIN_REQUIRED");

    // 2. Events RPC
    const eventsRes = await studentSupabase.rpc("get_admin_dashboard_events", { p_limit: 5 });
    expect(eventsRes.error).toBeDefined();
    expect(eventsRes.error?.message).toContain("FORBIDDEN_ADMIN_REQUIRED");
  });

  it("guest/unauthenticated user is forbidden from accessing dashboard RPCs", async () => {
    const anonSupabase = client();

    const statsRes = await anonSupabase.rpc("get_admin_dashboard_stats");
    expect(statsRes.error).toBeDefined();

    const eventsRes = await anonSupabase.rpc("get_admin_dashboard_events", { p_limit: 5 });
    expect(eventsRes.error).toBeDefined();
  });
});
