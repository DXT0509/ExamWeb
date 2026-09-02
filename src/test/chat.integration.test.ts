import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { sendChatMessageSchema } from "@/lib/validations/chat";

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

describe("Support Chat Schema, RLS, Lifecycle, and Protection Tests", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  it("AT-CHAT-001: Student initializes or gets their active conversation", async () => {
    const student = await signedIn("student1@example.test", "LocalStudent123!");

    const { data, error } = await student.rpc("get_or_create_student_conversation");
    expect(error).toBeNull();
    const conv = Array.isArray(data) ? data[0] : data;
    expect(conv).toBeDefined();
    expect(conv?.status).toBe("open");
    expect(conv?.student_id).toBe("10000000-0000-0000-0000-000000000002");
  });

  it("AT-CHAT-002: Enforces partial unique index for open conversations per student", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const studentId = "10000000-0000-0000-0000-000000000002";

    // Attempting to insert a second 'open' conversation for the same student fails partial unique index
    const { error } = await admin
      .from("conversations")
      .insert({ student_id: studentId, status: "open" });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23505"); // unique violation
  });

  it("AT-CHAT-003: Student sends message -> DB enforces sender_role='student' & updates unread counters", async () => {
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const { data: convData } = await student.rpc("get_or_create_student_conversation");
    const conv = (Array.isArray(convData) ? convData[0] : convData)!;

    const testContent = "Em muốn hỏi về quy chế thi toàn màn hình ạ!";
    const clientMsgId = crypto.randomUUID();

    const { data: msgData, error: msgError } = await student.rpc("send_chat_message", {
      p_conversation_id: conv.id,
      p_content: testContent,
      p_client_msg_id: clientMsgId,
    });

    expect(msgError).toBeNull();
    const msg = (Array.isArray(msgData) ? msgData[0] : msgData)!;
    expect(msg.content).toBe(testContent);
    expect(msg.sender_role).toBe("student");
    expect(msg.sender_id).toBe("10000000-0000-0000-0000-000000000002");

    // Check conversation unread count
    const { data: updatedConv } = await student
      .from("conversations")
      .select("admin_unread_count, student_unread_count")
      .eq("id", conv.id)
      .single();

    expect(updatedConv?.admin_unread_count).toBeGreaterThanOrEqual(1);
    expect(updatedConv?.student_unread_count).toBe(0);
  });

  it("AT-CHAT-004: RLS Isolation — Student A cannot read or write to Student B conversation", async () => {
    // Let's create another student user if not present
    const serviceClient = client(serviceRoleKey);
    const student2Id = "10000000-0000-0000-0000-000000000009";

    await serviceClient.auth.admin.createUser({
      id: student2Id,
      email: "student2@example.test",
      password: "LocalStudent123!",
      email_confirm: true,
      user_metadata: { display_name: "Học viên hai" },
    });

    // Ensure profile exists
    await serviceClient.from("profiles").upsert({
      id: student2Id,
      role: "student",
      status: "active",
      display_name: "Học viên hai",
    });

    const student2 = await signedIn("student2@example.test", "LocalStudent123!");
    const { data: conv2Data } = await student2.rpc("get_or_create_student_conversation");
    const conv2 = (Array.isArray(conv2Data) ? conv2Data[0] : conv2Data)!;

    // Student 1 signs in and attempts to access Student 2's conversation
    const student1 = await signedIn("student1@example.test", "LocalStudent123!");

    // 1. Student 1 queries conversations
    const { data: convList } = await student1
      .from("conversations")
      .select("*")
      .eq("id", conv2.id);

    expect(convList?.length).toBe(0); // Cannot see Student 2's conversation

    // 2. Student 1 attempts to insert message into Student 2's conversation via RPC
    const { error: rpcErr } = await student1.rpc("send_chat_message", {
      p_conversation_id: conv2.id,
      p_content: "Hacker message into other conversation",
    });

    expect(rpcErr).not.toBeNull();
    expect(rpcErr?.message).toContain("FORBIDDEN");
  });

  it("AT-CHAT-005: Role Protection — Student cannot spoof sender_role='admin'", async () => {
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const { data: convData } = await student.rpc("get_or_create_student_conversation");
    const conv = (Array.isArray(convData) ? convData[0] : convData)!;

    // Direct insert attempting to set sender_role = 'admin' is intercepted and forced to 'student' by before insert trigger
    const { data: directMsg, error } = await student
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: "10000000-0000-0000-0000-000000000002",
        sender_role: "admin", // Malicious spoof
        content: "Trying to forge admin role",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(directMsg?.sender_role).toBe("student"); // Automatically corrected to student!
  });

  it("AT-CHAT-006: Admin views all conversations and replies successfully", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const { data: convData } = await student.rpc("get_or_create_student_conversation");
    const conv = (Array.isArray(convData) ? convData[0] : convData)!;

    // Admin replies
    const adminReply = "Chào em! Em cần hỗ trợ chi tiết về nội dung nào?";
    const { data: replyData, error: replyError } = await admin.rpc("send_chat_message", {
      p_conversation_id: conv.id,
      p_content: adminReply,
    });

    expect(replyError).toBeNull();
    const reply = (Array.isArray(replyData) ? replyData[0] : replyData)!;
    expect(reply.sender_role).toBe("admin");
    expect(reply.sender_id).toBe("10000000-0000-0000-0000-000000000001");

    // Student now reads messages and unread counter is reset
    const { data: studentMsgs } = await student
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id);

    expect(studentMsgs?.some((m) => m.content === adminReply)).toBe(true);

    // Mark read
    await student.rpc("mark_conversation_read", { p_conversation_id: conv.id });
    const { data: checkConv } = await student
      .from("conversations")
      .select("student_unread_count")
      .eq("id", conv.id)
      .single();

    expect(checkConv?.student_unread_count).toBe(0);
  });

  it("AT-CHAT-007: Closed conversation lifecycle — auto-reopens when Student sends a new message", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const { data: convData } = await student.rpc("get_or_create_student_conversation");
    const conv = (Array.isArray(convData) ? convData[0] : convData)!;

    // Admin closes conversation
    await admin.from("conversations").update({ status: "closed" }).eq("id", conv.id);

    const { data: closedConv } = await student
      .from("conversations")
      .select("status")
      .eq("id", conv.id)
      .single();
    expect(closedConv?.status).toBe("closed");

    // Student sends a new message -> trigger automatically re-opens it
    const { error } = await student.rpc("send_chat_message", {
      p_conversation_id: conv.id,
      p_content: "Em có thêm câu hỏi mới ạ!",
    });
    expect(error).toBeNull();

    const { data: reopenedConv } = await student
      .from("conversations")
      .select("status")
      .eq("id", conv.id)
      .single();
    expect(reopenedConv?.status).toBe("open");
  });

  it("AT-CHAT-008: Idempotency protection — prevents duplicate messages on network retry", async () => {
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const { data: convData } = await student.rpc("get_or_create_student_conversation");
    const conv = (Array.isArray(convData) ? convData[0] : convData)!;

    const clientMsgId = crypto.randomUUID();
    const content = "Tin nhắn thử nghiệm idempotency chống duplicate.";

    // Send 1st time
    const { data: res1 } = await student.rpc("send_chat_message", {
      p_conversation_id: conv.id,
      p_content: content,
      p_client_msg_id: clientMsgId,
    });
    const msg1 = (Array.isArray(res1) ? res1[0] : res1)!;

    // Send 2nd time with SAME client_msg_id
    const { data: res2 } = await student.rpc("send_chat_message", {
      p_conversation_id: conv.id,
      p_content: content,
      p_client_msg_id: clientMsgId,
    });
    const msg2 = (Array.isArray(res2) ? res2[0] : res2)!;

    expect(msg1.id).toBe(msg2.id); // Same message returned, not duplicated
  });

  it("AT-CHAT-009: Message validation — reject empty, whitespace, and oversized messages", () => {
    expect(
      sendChatMessageSchema.safeParse({
        conversationId: "11111111-1111-1111-1111-111111111111",
        content: "",
      }).success
    ).toBe(false);

    expect(
      sendChatMessageSchema.safeParse({
        conversationId: "11111111-1111-1111-1111-111111111111",
        content: "   ",
      }).success
    ).toBe(false);

    expect(
      sendChatMessageSchema.safeParse({
        conversationId: "11111111-1111-1111-1111-111111111111",
        content: "A".repeat(2001),
      }).success
    ).toBe(false);

    expect(
      sendChatMessageSchema.safeParse({
        conversationId: "11111111-1111-1111-1111-111111111111",
        content: "Hợp lệ",
      }).success
    ).toBe(true);
  });

  it("AT-CHAT-010: Guest cannot insert message into database without logging in", async () => {
    const guest = client();
    const fakeConvId = "11111111-1111-1111-1111-111111111111";

    const { error } = await guest.rpc("send_chat_message", {
      p_conversation_id: fakeConvId,
      p_content: "Tin nhắn của guest chưa đăng nhập",
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("AUTH_REQUIRED");
  });
});
