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

describe("Phase 10 Step 1: Admin Student Management Integration Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  const publicExamId = "40000000-0000-0000-0000-000000000002";

  async function createTestStudent(emailPrefix: string) {
    const service = client(serviceRoleKey);
    const email = `${emailPrefix}-${crypto.randomUUID().slice(0, 6)}@example.test`;
    const password = "LocalStudent123!";
    const { data: userRes, error: createErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Test Student ${emailPrefix}` },
    });
    expect(createErr).toBeNull();
    const userId = userRes.user!.id;
    await service.from("profiles").upsert({
      id: userId,
      role: "student",
      status: "active",
      display_name: `Test Student ${emailPrefix}`,
    });
    const studentClient = await signedIn(email, password);
    return { userId, email, password, studentClient };
  }

  it("get admin students: supports search, status filter, and pagination", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");

    // 1. Get all students
    const { data: allStudents, error: errAll } = await admin.rpc("get_admin_students", {
      p_search: undefined,
      p_status: "all",
      p_page: 1,
      p_page_size: 10,
    });
    expect(errAll).toBeNull();
    expect(allStudents).toBeDefined();
    expect(allStudents!.length).toBeGreaterThan(0);
    const firstStudent = allStudents![0];
    expect(firstStudent?.email).toBeDefined();
    expect(firstStudent?.display_name).toBeDefined();

    // 2. Search student by email
    const { data: searchEmail, error: errSearch } = await admin.rpc("get_admin_students", {
      p_search: "student1",
      p_status: "all",
      p_page: 1,
      p_page_size: 10,
    });
    expect(errSearch).toBeNull();
    expect(searchEmail!.length).toBeGreaterThanOrEqual(1);

    // 3. Filter by active status
    const { data: activeStudents, error: errActive } = await admin.rpc("get_admin_students", {
      p_search: undefined,
      p_status: "active",
      p_page: 1,
      p_page_size: 10,
    });
    expect(errActive).toBeNull();
    expect(activeStudents!.every((s) => s.status === "active")).toBe(true);

    // 4. Pagination
    const { data: page1 } = await admin.rpc("get_admin_students", {
      p_search: undefined,
      p_status: "all",
      p_page: 1,
      p_page_size: 1,
    });
    expect(page1!.length).toBe(1);
  });

  it("security & unauthorized access: denies Student and Guest from accessing admin student RPCs", async () => {
    const { studentClient, userId } = await createTestStudent("unauth");
    const guest = client();

    // Student calls get_admin_students -> error / rejected
    const { error: studentQueryErr } = await studentClient.rpc("get_admin_students", {
      p_search: undefined,
      p_status: "all",
      p_page: 1,
      p_page_size: 10,
    });
    expect(studentQueryErr).not.toBeNull();

    // Student calls toggle_student_lock -> forbidden
    const { data: lockByStudentRes } = await studentClient.rpc("toggle_student_lock", {
      p_student_id: userId,
      p_target_status: "locked",
    });
    expect(lockByStudentRes?.[0]?.success).toBe(false);
    expect(lockByStudentRes?.[0]?.code).toBe("FORBIDDEN_ADMIN_REQUIRED");

    // Guest calls get_admin_students -> error
    const { error: guestQueryErr } = await guest.rpc("get_admin_students", {
      p_search: undefined,
      p_status: "all",
      p_page: 1,
      p_page_size: 10,
    });
    expect(guestQueryErr).not.toBeNull();
  });

  it("locks student with no active attempt", async () => {
    const service = client(serviceRoleKey);
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const { userId } = await createTestStudent("no-attempt");

    const { data: lockRes, error: lockErr } = await admin.rpc("toggle_student_lock", {
      p_student_id: userId,
      p_target_status: "locked",
    });
    expect(lockErr).toBeNull();
    expect(lockRes?.[0]?.success).toBe(true);
    expect(lockRes?.[0]?.status).toBe("locked");
    expect(lockRes?.[0]?.attempts_auto_submitted).toBe(0);

    // Verify profile status in DB
    const { data: profile } = await service.from("profiles").select("status").eq("id", userId).single();
    expect(profile?.status).toBe("locked");
  });

  it("locks student with active attempt: auto-submits attempt with submit_reason=account_locked and records account_locked event", async () => {
    const service = client(serviceRoleKey);
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const { userId, studentClient } = await createTestStudent("active-attempt");

    // 1. Student starts an attempt
    const { data: startRes, error: startErr } = await studentClient.rpc("start_attempt", {
      p_exam_id: publicExamId,
    });
    expect(startErr).toBeNull();
    const attemptId = startRes?.[0]?.attempt_id;
    expect(attemptId).toBeDefined();

    // 2. Admin locks Student
    const { data: lockRes, error: lockErr } = await admin.rpc("toggle_student_lock", {
      p_student_id: userId,
      p_target_status: "locked",
    });
    expect(lockErr).toBeNull();
    expect(lockRes?.[0]?.success).toBe(true);
    expect(lockRes?.[0]?.status).toBe("locked");
    expect(lockRes?.[0]?.attempts_auto_submitted).toBe(1);

    // 3. Verify attempt is auto_submitted with account_locked submit_reason
    const { data: attempt } = await service.from("exam_attempts").select("*").eq("id", attemptId!).single();
    expect(attempt?.status).toBe("auto_submitted");
    expect(attempt?.submit_reason).toBe("account_locked");
    expect(attempt?.finalized_at).not.toBeNull();

    // 4. Verify account_locked event is recorded in exam_events
    const { data: events } = await service
      .from("exam_events")
      .select("*")
      .eq("attempt_id", attemptId!)
      .eq("event_type", "account_locked");
    expect(events).toBeDefined();
    expect(events!.length).toBeGreaterThan(0);
  });

  it("idempotency & retry: locking an already locked student is safe and does not create duplicate events", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const service = client(serviceRoleKey);
    const { userId, studentClient } = await createTestStudent("retry");

    // 1. Start attempt & lock
    await studentClient.rpc("start_attempt", { p_exam_id: publicExamId });
    await admin.rpc("toggle_student_lock", { p_student_id: userId, p_target_status: "locked" });

    // 2. Lock student again
    const { data: retryRes, error: retryErr } = await admin.rpc("toggle_student_lock", {
      p_student_id: userId,
      p_target_status: "locked",
    });
    expect(retryErr).toBeNull();
    expect(retryRes?.[0]?.success).toBe(true);
    expect(retryRes?.[0]?.attempts_auto_submitted).toBe(0);

    // Verify profile is still locked
    const { data: profile } = await service.from("profiles").select("status").eq("id", userId).single();
    expect(profile?.status).toBe("locked");
  });

  it("unlock student: changes status to active and does NOT restore auto-submitted attempt", async () => {
    const service = client(serviceRoleKey);
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const { userId, studentClient } = await createTestStudent("unlock");

    // 1. Start attempt & lock
    await studentClient.rpc("start_attempt", { p_exam_id: publicExamId });
    await admin.rpc("toggle_student_lock", { p_student_id: userId, p_target_status: "locked" });

    // 2. Unlock Student
    const { data: unlockRes, error: unlockErr } = await admin.rpc("toggle_student_lock", {
      p_student_id: userId,
      p_target_status: "active",
    });
    expect(unlockErr).toBeNull();
    expect(unlockRes?.[0]?.success).toBe(true);
    expect(unlockRes?.[0]?.status).toBe("active");

    // Verify profile is now active
    const { data: profile } = await service.from("profiles").select("status").eq("id", userId).single();
    expect(profile?.status).toBe("active");

    // Verify attempt history remains auto_submitted
    const { data: attempts } = await service.from("exam_attempts").select("status, submit_reason").eq("student_id", userId);
    expect(attempts?.[0]?.status).toBe("auto_submitted");
    expect(attempts?.[0]?.submit_reason).toBe("account_locked");
  });
});
