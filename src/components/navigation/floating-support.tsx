"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, LogIn, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_FAQS } from "@/lib/constants/faq";
import {
  getOrCreateStudentConversationAction,
  getStudentChatHistoryAction,
  markConversationReadAction,
  sendChatMessageAction,
} from "@/lib/chat/actions";
import type { ChatMessage, ConversationItem } from "@/lib/chat/types";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import Link from "next/link";

interface FloatingSupportProps {
  userRole?: string;
}

export function FloatingSupport({ userRole }: FloatingSupportProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"faq" | "chat">("faq");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Check auth and immediately fetch conversation & unread count on mount
  useEffect(() => {
    if (userRole === "admin") return;
    const supabase = createClient();
    let isMounted = true;

    const fetchUserAndConversation = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        setAuthChecked(true);

        // Fetch student conversation immediately in background so unread badge is populated
        try {
          const res = await getOrCreateStudentConversationAction();
          if (isMounted && res.data) {
            setConversation(res.data);
          }
        } catch (err) {
          console.error("Error fetching initial student conversation:", err);
        }
      } else {
        setUser(null);
        setAuthChecked(true);
        setConversation(null);
      }
    };

    fetchUserAndConversation();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
        try {
          const res = await getOrCreateStudentConversationAction();
          if (isMounted && res.data) {
            setConversation(res.data);
          }
        } catch (err) {
          console.error("Error fetching student conversation on auth change:", err);
        }
      } else {
        setUser(null);
        setConversation(null);
        setMessages([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [userRole]);

  // When switching to chat view, ensure conversation & messages history are loaded
  useEffect(() => {
    if (userRole === "admin") return;
    if (!isOpen || view !== "chat" || !user) return;

    let isMounted = true;
    const fetchChat = async () => {
      let currentConvId = conversation?.id;

      if (!currentConvId) {
        setLoadingHistory(true);
        const res = await getOrCreateStudentConversationAction();
        if (!isMounted) return;

        if (res.error || !res.data) {
          toast.error(res.error || "Không thể kết nối cuộc trò chuyện.");
          setLoadingHistory(false);
          return;
        }

        setConversation(res.data);
        currentConvId = res.data.id;
      }

      // Mark read if there were unread messages
      if (conversation?.student_unread_count && conversation.student_unread_count > 0) {
        markConversationReadAction(currentConvId);
        setConversation((prev) => (prev ? { ...prev, student_unread_count: 0 } : null));
      }

      setLoadingHistory(true);
      const histRes = await getStudentChatHistoryAction(currentConvId);
      if (!isMounted) return;
      setLoadingHistory(false);
      if (histRes.data) {
        setMessages(histRes.data);
      }
    };

    fetchChat();

    return () => {
      isMounted = false;
    };
  }, [isOpen, view, user, conversation?.id, userRole]);

  // Realtime subscription for conversation updates and incoming messages
  useEffect(() => {
    if (userRole === "admin" || !conversation?.id) return;

    const supabase = createClient();
    const convId = conversation.id;
    const channelName = `student-support-${convId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${convId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<ConversationItem>;
          setConversation((prev) => {
            if (!prev) return null;
            // If chat is open and in chat view, keep unread count at 0
            const nextUnread =
              isOpen && view === "chat"
                ? 0
                : updated.student_unread_count !== undefined
                ? updated.student_unread_count
                : prev.student_unread_count;
            return {
              ...prev,
              ...updated,
              student_unread_count: nextUnread,
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;

          // Append message
          setMessages((prev) => {
            if (
              prev.some(
                (m) =>
                  m.id === newMsg.id ||
                  (m.client_msg_id && newMsg.client_msg_id && m.client_msg_id === newMsg.client_msg_id)
              )
            ) {
              return prev;
            }
            return [...prev, newMsg];
          });

          // Handle incoming message from admin
          if (newMsg.sender_role === "admin") {
            if (isOpen && view === "chat") {
              // Read immediately
              markConversationReadAction(convId);
              setConversation((prev) => (prev ? { ...prev, student_unread_count: 0 } : null));
            } else {
              // Increment unread count locally for instant UI update
              setConversation((prev) =>
                prev
                  ? {
                      ...prev,
                      student_unread_count: prev.student_unread_count + 1,
                      last_message_at: newMsg.created_at,
                    }
                  : null
              );
            }
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, isOpen, view, userRole]);

  // Auto-scroll to bottom on message list change
  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view, loadingHistory]);

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && view === "chat" && conversation?.id && (conversation.student_unread_count || 0) > 0) {
      setConversation((c) => (c ? { ...c, student_unread_count: 0 } : null));
      markConversationReadAction(conversation.id);
    }
  };

  const handleSwitchToChat = () => {
    setView("chat");
    if (conversation?.id && (conversation.student_unread_count || 0) > 0) {
      setConversation((c) => (c ? { ...c, student_unread_count: 0 } : null));
      markConversationReadAction(conversation.id);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputMessage.trim();
    if (!content || !conversation?.id || isPending) return;

    const clientMsgId = crypto.randomUUID();
    setInputMessage("");

    startTransition(async () => {
      const res = await sendChatMessageAction({
        conversationId: conversation.id,
        content,
        clientMsgId,
      });

      if (res.error) {
        toast.error(res.error);
        setInputMessage(content); // Restore on error
        return;
      }

      if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data!.id || m.client_msg_id === clientMsgId)) {
            return prev;
          }
          return [...prev, res.data!];
        });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Hide on admin screens
  if (userRole === "admin") {
    return null;
  }

  const unreadCount = conversation?.student_unread_count || 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Support Assistant Dialog Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Trợ lý học tập trực tuyến"
          className="mb-3 w-84 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 flex flex-col max-h-[560px] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3 shrink-0">
            <div className="flex items-center gap-2">
              {view === "chat" && (
                <button
                  type="button"
                  onClick={() => setView("faq")}
                  aria-label="Quay lại câu hỏi thường gặp"
                  className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors mr-1 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)]">Trợ lý học tập trực tuyến</h4>
                <p className="text-[10px] text-[var(--accent)] font-medium">● Đang hoạt động 24/7</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng trợ lý"
              className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* VIEW 1: FAQ ACCORDION */}
          {view === "faq" && (
            <div className="my-3 flex-1 overflow-y-auto pr-1 space-y-3">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] px-1">
                Bạn cần hỗ trợ gì?
              </div>

              <div className="space-y-2">
                {SUPPORT_FAQS.map((faq, index) => {
                  const isExpanded = expandedFaq === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all duration-200 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(faq.id)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <span className="text-xs font-medium text-[var(--foreground)] flex items-center gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[10px] font-bold text-[var(--primary)]">
                            {index + 1}
                          </span>
                          {faq.question}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[var(--divider)] bg-[var(--surface)] p-3 text-[11px] leading-relaxed text-[var(--muted-foreground)] animate-in fade-in-50 duration-200">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[var(--divider)] pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSwitchToChat}
                  className="w-full justify-center gap-2 rounded-xl border-[var(--border)] bg-[var(--card)] py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] shadow-xs cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-[var(--primary)]" />
                  Chat trực tiếp với Admin
                </Button>
              </div>
            </div>
          )}

          {/* VIEW 2: LIVE CHAT WITH ADMIN */}
          {view === "chat" && (
            <div className="my-2 flex-1 flex flex-col min-h-0">
              {!authChecked ? (
                <div className="flex flex-1 items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                </div>
              ) : !user ? (
                /* Guest Login Required State */
                <div className="flex flex-1 flex-col items-center justify-center p-4 text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-[var(--foreground)]">Trò chuyện với Quản trị viên</h5>
                    <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                      Vui lòng đăng nhập tài khoản để bắt đầu trò chuyện trực tiếp và lưu trữ lịch sử tư vấn.
                    </p>
                  </div>
                  <Link href="/login" className="w-full">
                    <Button
                      size="sm"
                      className="w-full gap-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md cursor-pointer"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Đăng nhập tài khoản
                    </Button>
                  </Link>
                </div>
              ) : loadingHistory ? (
                /* Loading Messages History State */
                <div className="flex flex-1 items-center justify-center py-8 space-y-2 flex-col">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                  <span className="text-[11px] text-[var(--muted-foreground)]">Đang tải lịch sử trò chuyện...</span>
                </div>
              ) : (
                /* Active Chat Interface */
                <>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[300px] min-h-[160px] py-1 text-xs">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-6 text-center space-y-1 text-[var(--muted-foreground)]">
                        <MessageSquare className="h-6 w-6 opacity-40 mb-1" />
                        <p className="font-medium text-xs text-[var(--foreground)]">Bắt đầu cuộc hội thoại</p>
                        <p className="text-[11px]">
                          Gửi tin nhắn nếu bạn cần trợ giúp về bài thi, kỹ thuật hoặc tài liệu học tập.
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.sender_role === "student";
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <div className="text-[9px] text-[var(--muted-foreground)] px-1 mb-0.5">
                              {isMe ? "Bạn" : "Quản trị viên"} •{" "}
                              {new Date(m.created_at).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div
                              className={`max-w-[82%] rounded-xl px-3 py-2 leading-relaxed text-xs break-words ${
                                isMe
                                  ? "bg-[var(--primary)] text-white shadow-xs"
                                  : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-xs"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input Box */}
                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-[var(--divider)] pt-2.5 flex items-end gap-2 shrink-0"
                  >
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Nhập tin nhắn (Enter để gửi)..."
                      disabled={isPending}
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none min-h-[36px] max-h-[80px]"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!inputMessage.trim() || isPending}
                      aria-label="Gửi tin nhắn"
                      className="h-9 w-9 p-0 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md shrink-0 cursor-pointer"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className="group relative flex h-13 w-13 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-xl shadow-blue-600/30 hover:scale-105 hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 cursor-pointer"
        aria-label="Trợ lý học tập trực tuyến"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-[var(--surface)] animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
