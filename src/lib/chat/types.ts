export type ConversationStatus = "open" | "closed" | "archived";
export type MessageSenderRole = "student" | "admin";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: MessageSenderRole;
  content: string;
  client_msg_id?: string | null;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  student_id: string;
  status: ConversationStatus;
  last_message_at: string;
  admin_unread_count: number;
  student_unread_count: number;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    display_name?: string | null;
    email?: string | null;
  } | null;
  last_message?: string | null;
}

export interface AdminConversationDetail extends ConversationItem {
  messages: ChatMessage[];
}
