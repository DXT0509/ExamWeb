"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-user";
import {
  sendChatMessageSchema,
  updateConversationStatusSchema,
  type SendChatMessageInput,
  type UpdateConversationStatusInput,
} from "@/lib/validations/chat";
import type { ChatMessage, ConversationItem, ConversationStatus } from "./types";

export interface ActionResult<T> {
  data?: T;
  error?: string | null;
}

/**
 * Lấy hoặc tạo cuộc trò chuyện cho Student đang đăng nhập.
 */
export async function getOrCreateStudentConversationAction(): Promise<ActionResult<ConversationItem>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_or_create_student_conversation");

    if (error) {
      return { error: error.message || "Không thể khởi tạo cuộc hội thoại." };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { error: "Không tìm thấy cuộc hội thoại." };
    }

    return {
      data: {
        id: row.id,
        student_id: row.student_id,
        status: row.status as ConversationStatus,
        last_message_at: row.last_message_at,
        admin_unread_count: row.admin_unread_count,
        student_unread_count: row.student_unread_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    };
  } catch (err) {
    return { error: (err as Error).message || "Đã xảy ra lỗi không xác định." };
  }
}

/**
 * Lấy toàn bộ lịch sử tin nhắn của Student trong cuộc trò chuyện và đánh dấu đã đọc.
 */
export async function getStudentChatHistoryAction(
  conversationId: string
): Promise<ActionResult<ChatMessage[]>> {
  try {
    const supabase = await createClient();
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, sender_role, content, client_msg_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return { error: error.message || "Không thể tải lịch sử tin nhắn." };
    }

    // Đánh dấu đã đọc cho Student
    await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });

    return { data: (messages as ChatMessage[]) || [] };
  } catch (err) {
    return { error: (err as Error).message || "Đã xảy ra lỗi không xác định." };
  }
}

/**
 * Gửi tin nhắn mới (hỗ trợ cả Student và Admin).
 * sender_id và sender_role được DB tự động xác định từ phiên đăng nhập.
 */
export async function sendChatMessageAction(
  input: SendChatMessageInput
): Promise<ActionResult<ChatMessage>> {
  try {
    const parsed = sendChatMessageSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("send_chat_message", {
      p_conversation_id: parsed.data.conversationId,
      p_content: parsed.data.content,
      p_client_msg_id: parsed.data.clientMsgId ?? undefined,
    });

    if (error) {
      if (error.message.includes("RATE_LIMIT_EXCEEDED")) {
        return { error: "Bạn gửi tin nhắn quá nhanh. Vui lòng thử lại sau giây lát." };
      }
      if (error.message.includes("CONVERSATION_ARCHIVED")) {
        return { error: "Cuộc trò chuyện này đã được lưu trữ, không thể gửi thêm tin nhắn." };
      }
      if (error.message.includes("INVALID_MESSAGE_LENGTH")) {
        return { error: "Nội dung tin nhắn không hợp lệ (từ 1 đến 2000 ký tự)." };
      }
      return { error: error.message || "Không thể gửi tin nhắn." };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { error: "Không nhận được phản hồi sau khi gửi tin nhắn." };
    }

    return {
      data: {
        id: row.id,
        conversation_id: row.conversation_id,
        sender_id: row.sender_id,
        sender_role: row.sender_role,
        content: row.content,
        client_msg_id: row.client_msg_id,
        created_at: row.created_at,
      },
    };
  } catch (err) {
    return { error: (err as Error).message || "Đã xảy ra lỗi không xác định." };
  }
}

/**
 * Đánh dấu đã đọc cuộc trò chuyện.
 */
export async function markConversationReadAction(conversationId: string): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("mark_conversation_read", {
      p_conversation_id: conversationId,
    });
    if (error) return { error: error.message };
    return { data: !!data };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Lấy danh sách cuộc trò chuyện cho Admin Inbox.
 */
export async function getAdminConversationsAction(params?: {
  search?: string;
  status?: ConversationStatus | "all";
}): Promise<ActionResult<ConversationItem[]>> {
  try {
    await requireRole("admin", "/admin");
    const supabase = await createClient();

    let query = supabase
      .from("conversations")
      .select(
        `
        id,
        student_id,
        status,
        last_message_at,
        admin_unread_count,
        student_unread_count,
        created_at,
        updated_at,
        student:profiles!conversations_student_id_fkey(id, display_name)
      `
      )
      .order("last_message_at", { ascending: false });

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;
    if (error) {
      return { error: error.message || "Không thể lấy danh sách cuộc trò chuyện." };
    }

    // Fetch latest message for each conversation
    const convIds = (data || []).map((c) => c.id);
    const latestMessagesMap = new Map<string, string>();

    if (convIds.length > 0) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      if (msgs) {
        for (const msg of msgs) {
          if (!latestMessagesMap.has(msg.conversation_id)) {
            latestMessagesMap.set(msg.conversation_id, msg.content);
          }
        }
      }
    }

    let items: ConversationItem[] = (data || []).map(
      (c: {
        id: string;
        student_id: string;
        status: string;
        last_message_at: string;
        admin_unread_count: number;
        student_unread_count: number;
        created_at: string;
        updated_at: string;
        student?: { id: string; display_name: string | null } | { id: string; display_name: string | null }[] | null;
      }) => {
        const studentProfile = Array.isArray(c.student) ? c.student[0] : c.student;
        return {
          id: c.id,
          student_id: c.student_id,
          status: c.status as ConversationStatus,
          last_message_at: c.last_message_at,
          admin_unread_count: c.admin_unread_count,
          student_unread_count: c.student_unread_count,
          created_at: c.created_at,
          updated_at: c.updated_at,
          student: studentProfile
            ? {
                id: studentProfile.id,
                display_name: studentProfile.display_name,
              }
            : null,
          last_message: latestMessagesMap.get(c.id) || null,
        };
      }
    );

    if (params?.search && params.search.trim()) {
      const s = params.search.trim().toLowerCase();
      items = items.filter((item) => {
        const name = (item.student?.display_name || "").toLowerCase();
        const lastMsg = (item.last_message || "").toLowerCase();
        return name.includes(s) || lastMsg.includes(s);
      });
    }

    return { data: items };
  } catch (err) {
    return { error: (err as Error).message || "Đã xảy ra lỗi không xác định." };
  }
}

/**
 * Lấy lịch sử tin nhắn cuộc trò chuyện cho Admin.
 */
export async function getAdminConversationMessagesAction(
  conversationId: string
): Promise<ActionResult<ChatMessage[]>> {
  try {
    await requireRole("admin", "/admin");
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, sender_role, content, client_msg_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return { error: error.message || "Không thể tải tin nhắn cuộc trò chuyện." };
    }

    // Đánh dấu đã đọc cho Admin
    await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });

    return { data: (messages as ChatMessage[]) || [] };
  } catch (err) {
    return { error: (err as Error).message || "Đã xảy ra lỗi không xác định." };
  }
}

/**
 * Cập nhật trạng thái cuộc trò chuyện (Đóng / Mở lại / Lưu trữ).
 */
export async function updateConversationStatusAction(
  input: UpdateConversationStatusInput
): Promise<ActionResult<boolean>> {
  try {
    await requireRole("admin", "/admin");
    const parsed = updateConversationStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("conversations")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.conversationId);

    if (error) {
      return { error: error.message || "Không thể cập nhật trạng thái cuộc trò chuyện." };
    }

    return { data: true };
  } catch (err) {
    return { error: (err as Error).message || "Đã xảy ra lỗi không xác định." };
  }
}

/**
 * Đếm số lượng học sinh / cuộc trò chuyện có tin nhắn chưa được Admin phản hồi.
 */
export async function getAdminUnreadConversationCountAction(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .gt("admin_unread_count", 0);

    if (error) {
      return { error: error.message };
    }

    return { data: count ?? 0 };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
