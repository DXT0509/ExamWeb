import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const sendChatMessageSchema = z.object({
  conversationId: z.string().regex(uuidRegex, { message: "ID cuộc hội thoại không hợp lệ." }),
  content: z
    .string()
    .trim()
    .min(1, { message: "Tin nhắn không được để trống." })
    .max(2000, { message: "Tin nhắn không được vượt quá 2000 ký tự." }),
  clientMsgId: z
    .string()
    .regex(uuidRegex, { message: "Client Msg ID không hợp lệ." })
    .optional(),
});

export const updateConversationStatusSchema = z.object({
  conversationId: z.string().regex(uuidRegex, { message: "ID cuộc hội thoại không hợp lệ." }),
  status: z.enum(["open", "closed", "archived"], {
    message: "Trạng thái cuộc hội thoại không hợp lệ.",
  }),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>;
