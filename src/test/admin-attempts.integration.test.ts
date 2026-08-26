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

describe("Phase 10 Step 2: Admin Attempt Management & Monitoring Integration Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  let adminUserId: string;
  let adminEmail: string;
  let studentUserId: string;
  let studentEmail: string;
  let guestSessionHash: string;
  let examId: string;
  let subjectId: string;
  let submittedAttemptId: string;
  let accountLockedAttemptId: string;
  let guestAttemptId: string;

  beforeAll(async () => {
    const adminSupabase = client(serviceRoleKey);

    // 1. Create unique Admin user
    adminEmail = `admin_att_${crypto.randomUUID().slice(0, 8)}@example.test`;
    const { data: adminAuth, error: adminErr } = await adminSupabase.auth.admin.createUser({
      email: adminEmail,
      password: "LocalAdmin123!",
      email_confirm: true,
      user_metadata: { role: "admin", display_name: "Admin Attempts Tester" },
    });
    if (adminErr || !adminAuth.user) {
      throw adminErr || new Error("Failed to create admin test user");
    }
    adminUserId = adminAuth.user.id;

    await adminSupabase
      .from("profiles")
      .upsert({ id: adminUserId, display_name: "Admin Attempts Tester", role: "admin", status: "active" });

    // 2. Create Student user
    studentEmail = `student_att_${crypto.randomUUID().slice(0, 8)}@example.test`;
    const { data: studentAuth, error: studentCreateErr } = await adminSupabase.auth.admin.createUser({
      email: studentEmail,
      password: "Student123!",
      email_confirm: true,
      user_metadata: { role: "student", display_name: "Học sinh kiểm thử lượt thi" },
    });
    if (studentCreateErr || !studentAuth.user) {
      throw studentCreateErr || new Error("Failed to create student test user");
    }
    studentUserId = studentAuth.user.id;

    // 3. Use existing THPT subject & draft exam
    const { data: existingSub } = await adminSupabase
      .from("subjects")
      .select("id")
      .eq("slug", "toan-hoc")
      .single();
    subjectId = existingSub?.id ?? "20000000-0000-0000-0000-000000000001";

    const examSlug = `exam-attempts-${crypto.randomUUID().slice(0, 8)}`;
    const { data: examData, error: examErr } = await adminSupabase
      .from("exams")
      .insert({
        title: "Đề thi kiểm thử quản lý lượt thi Admin",
        slug: examSlug,
        subject_id: subjectId,
        duration_minutes: 30,
        access_type: "public",
        status: "draft",
        created_by: adminUserId,
        updated_by: adminUserId,
      })
      .select()
      .single();
    if (examErr || !examData) throw examErr || new Error("Failed to create test exam");
    examId = examData.id;

    // Add Section & Questions while draft (position 1-based)
    const { data: secData, error: secErr } = await adminSupabase
      .from("exam_sections")
      .insert({
        exam_id: examId,
        title: "Phần 1",
        position: 1,
      })
      .select()
      .single();
    if (secErr || !secData) throw secErr || new Error("Failed to create test section");

    const { data: qData, error: qErr } = await adminSupabase
      .from("questions")
      .insert({
        section_id: secData.id,
        content: "Câu hỏi test 1",
        score: 10,
        position: 1,
        explanation: "Giải thích câu 1",
      })
      .select()
      .single();
    if (qErr || !qData) throw qErr || new Error("Failed to create test question");

    const { data: optData, error: optErr } = await adminSupabase
      .from("question_options")
      .insert([
        {
          question_id: qData.id,
          content: "Đáp án đúng A",
          is_correct: true,
          position: 1,
        },
        {
          question_id: qData.id,
          content: "Đáp án sai B",
          is_correct: false,
          position: 2,
        },
      ])
      .select();
    if (optErr || !optData) throw optErr || new Error("Failed to create test options");

    const correctOptId = optData.find((o) => o.is_correct)!.id;

    // Update exam status to published
    await adminSupabase
      .from("exams")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", examId);

    // 4. Create Student Attempt 1 (submitted)
    const { data: att1, error: att1Err } = await adminSupabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        student_id: studentUserId,
        status: "submitted",
        started_at: new Date(Date.now() - 3600000).toISOString(),
        deadline_at: new Date(Date.now() + 3600000).toISOString(),
        submitted_at: new Date(Date.now() - 1800000).toISOString(),
        submit_reason: "student_submit",
        score: 10,
        max_score: 10,
        correct_answers: 1,
        wrong_answers: 0,
        blank_answers: 0,
        finalized_at: new Date(Date.now() - 1800000).toISOString(),
      })
      .select()
      .single();
    if (att1Err || !att1) throw att1Err || new Error("Failed to create att1");
    submittedAttemptId = att1.id;

    const { error: ansErr } = await adminSupabase.from("attempt_answers").insert({
      attempt_id: submittedAttemptId,
      question_id: qData.id,
      selected_option_id: correctOptId,
    });
    if (ansErr) throw ansErr;

    const { error: ev1Err } = await adminSupabase.from("exam_events").insert([
      {
        attempt_id: submittedAttemptId,
        event_type: "attempt_started",
        metadata: { client_ip: "127.0.0.1" },
      },
      {
        attempt_id: submittedAttemptId,
        event_type: "answer_saved",
        metadata: { question_id: qData.id },
      },
      {
        attempt_id: submittedAttemptId,
        event_type: "submit_completed",
        metadata: { submit_reason: "student_submit" },
      },
    ]);
    if (ev1Err) throw ev1Err;

    // 5. Create Student Attempt 2 (account_locked & fullscreen_violation events)
    const { data: att2, error: att2Err } = await adminSupabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        student_id: studentUserId,
        status: "auto_submitted",
        started_at: new Date(Date.now() - 7200000).toISOString(),
        deadline_at: new Date(Date.now() + 3600000).toISOString(),
        submitted_at: new Date(Date.now() - 3600000).toISOString(),
        submit_reason: "account_locked",
        score: 0,
        max_score: 10,
        correct_answers: 0,
        wrong_answers: 0,
        blank_answers: 1,
        finalized_at: new Date(Date.now() - 3600000).toISOString(),
      })
      .select()
      .single();
    if (att2Err || !att2) throw att2Err || new Error("Failed to create att2");
    accountLockedAttemptId = att2.id;

    const { error: ev2Err } = await adminSupabase.from("exam_events").insert([
      {
        attempt_id: accountLockedAttemptId,
        event_type: "attempt_started",
        metadata: {},
      },
      {
        attempt_id: accountLockedAttemptId,
        event_type: "fullscreen_exit",
        metadata: { reason: "tab_switch" },
      },
      {
        attempt_id: accountLockedAttemptId,
        event_type: "violation_resolved",
        metadata: {},
      },
      {
        attempt_id: accountLockedAttemptId,
        event_type: "account_locked",
        metadata: { auto_submitted: true },
      },
    ]);
    if (ev2Err) throw ev2Err;

    // 6. Create Guest Attempt
    guestSessionHash = "b".repeat(64);
    const { data: att3, error: att3Err } = await adminSupabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        guest_session_hash: guestSessionHash,
        status: "submitted",
        started_at: new Date(Date.now() - 10800000).toISOString(),
        deadline_at: new Date(Date.now() + 3600000).toISOString(),
        submitted_at: new Date(Date.now() - 9000000).toISOString(),
        submit_reason: "student_submit",
        score: 0,
        max_score: 10,
        correct_answers: 0,
        wrong_answers: 1,
        blank_answers: 0,
        finalized_at: new Date(Date.now() - 9000000).toISOString(),
      })
      .select()
      .single();
    if (att3Err || !att3) throw att3Err || new Error("Failed to create att3");
    guestAttemptId = att3.id;
  });

  async function getAdminClient() {
    const adminClient = client();
    const { error } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: "LocalAdmin123!",
    });
    expect(error).toBeNull();
    return adminClient;
  }

  it("get admin attempts: supports search, filter by subject, exam, status, submit_reason and pagination", async () => {
    const adminSupabase = await getAdminClient();

    // Query as Admin
    const { data, error } = await adminSupabase.rpc("get_admin_attempts", {
      p_search: undefined,
      p_subject_id: subjectId,
      p_exam_id: examId,
      p_status: "all",
      p_submit_reason: "all",
      p_page: 1,
      p_page_size: 10,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThanOrEqual(3);

    // Verify search by student email
    const { data: searchEmailData } = await adminSupabase.rpc("get_admin_attempts", {
      p_search: studentEmail,
      p_subject_id: undefined,
      p_exam_id: undefined,
      p_status: "all",
      p_submit_reason: "all",
      p_page: 1,
      p_page_size: 10,
    });
    expect(searchEmailData!.length).toBe(2);

    // Verify filter by status
    const { data: autoSubmittedData } = await adminSupabase.rpc("get_admin_attempts", {
      p_search: undefined,
      p_subject_id: undefined,
      p_exam_id: examId,
      p_status: "auto_submitted",
      p_submit_reason: "all",
      p_page: 1,
      p_page_size: 10,
    });
    expect(autoSubmittedData!.some((item) => item.attempt_id === accountLockedAttemptId)).toBe(true);

    // Verify filter by submit_reason
    const { data: accountLockedData } = await adminSupabase.rpc("get_admin_attempts", {
      p_search: undefined,
      p_subject_id: undefined,
      p_exam_id: examId,
      p_status: "all",
      p_submit_reason: "account_locked",
      p_page: 1,
      p_page_size: 10,
    });
    expect(accountLockedData!.some((item) => item.attempt_id === accountLockedAttemptId)).toBe(true);
  });

  it("security & unauthorized access: denies Student and Guest from calling get_admin_attempts and get_admin_attempt_detail", async () => {
    // Student client
    const studentClient = client();
    await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: "Student123!",
    });

    const { error: studentErr } = await studentClient.rpc("get_admin_attempts", {
      p_page: 1,
      p_page_size: 10,
    });
    expect(studentErr).not.toBeNull();
    expect(studentErr?.message).toMatch(/FORBIDDEN_ADMIN_REQUIRED/);

    const { error: studentDetailErr } = await studentClient.rpc("get_admin_attempt_detail", {
      p_attempt_id: submittedAttemptId,
    });
    expect(studentDetailErr).not.toBeNull();
    expect(studentDetailErr?.message).toMatch(/FORBIDDEN_ADMIN_REQUIRED/);

    // Guest / Anon client
    const guestClient = client();
    const { error: guestErr } = await guestClient.rpc("get_admin_attempts", {
      p_page: 1,
      p_page_size: 10,
    });
    expect(guestErr).not.toBeNull();
    expect(guestErr?.message).toMatch(/FORBIDDEN_ADMIN_REQUIRED/);
  });

  it("get attempt detail & answers breakdown: returns complete exam response and questions detail for Admin", async () => {
    const adminSupabase = await getAdminClient();

    const { data, error } = await adminSupabase.rpc("get_admin_attempt_detail", {
      p_attempt_id: submittedAttemptId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const res = data as Record<string, unknown>;
    expect(res.attempt_id).toBe(submittedAttemptId);
    expect(res.exam_id).toBe(examId);
    expect(res.student_email).toBe(studentEmail);
    expect(res.is_guest).toBe(false);
    expect(res.status).toBe("submitted");
    expect(res.score).toBe(10);
    expect(res.max_score).toBe(10);

    const questions = res.questions_detail as Array<Record<string, unknown>>;
    expect(questions.length).toBeGreaterThan(0);
    const q1 = questions[0];
    expect(q1).toBeDefined();
    expect(q1!.content).toBe("Câu hỏi test 1");
    expect(q1!.is_correct).toBe(true);
    expect(q1!.explanation).toBe("Giải thích câu 1");
  });

  it("get attempt events log: returns audit logs for fullscreen violation and account lock events", async () => {
    const adminSupabase = await getAdminClient();

    const { data, error } = await adminSupabase.rpc("get_admin_attempt_detail", {
      p_attempt_id: accountLockedAttemptId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const res = data as Record<string, unknown>;
    expect(res.status).toBe("auto_submitted");
    expect(res.submit_reason).toBe("account_locked");

    const events = res.events_log as Array<Record<string, unknown>>;
    expect(events.length).toBe(4);
    expect(events.some((e) => e.event_type === "fullscreen_exit")).toBe(true);
    expect(events.some((e) => e.event_type === "violation_resolved")).toBe(true);
    expect(events.some((e) => e.event_type === "account_locked")).toBe(true);
  });

  it("guest attempt inspection: displays guest indicator and null student email for Guest attempts", async () => {
    const adminSupabase = await getAdminClient();

    const { data, error } = await adminSupabase.rpc("get_admin_attempt_detail", {
      p_attempt_id: guestAttemptId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const res = data as Record<string, unknown>;
    expect(res.attempt_id).toBe(guestAttemptId);
    expect(res.is_guest).toBe(true);
    expect(res.student_name).toBe("Khách");
    expect(res.student_email).toBeNull();
  });
});
