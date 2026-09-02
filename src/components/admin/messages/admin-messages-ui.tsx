"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAdminConversationMessagesAction,
  getAdminConversationsAction,
  sendChatMessageAction,
  updateConversationStatusAction,
} from "@/lib/chat/actions";
import type { ChatMessage, ConversationItem, ConversationStatus } from "@/lib/chat/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function AdminMessagesUI() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");

  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || null;

  // Load conversations list
  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    const res = await getAdminConversationsAction({
      search: searchQuery,
      status: statusFilter,
    });
    setLoadingList(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data) {
      setConversations(res.data);
      setSelectedConvId((currentId) => {
        if (!currentId && res.data && res.data.length > 0 && res.data[0]) {
          return res.data[0].id;
        }
        return currentId;
      });
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    let isMounted = true;
    const fetchList = async () => {
      setLoadingList(true);
      const res = await getAdminConversationsAction({
        search: searchQuery,
        status: statusFilter,
      });
      if (!isMounted) return;
      setLoadingList(false);
      if (res.data) {
        setConversations(res.data);
        setSelectedConvId((currentId) => {
          if (!currentId && res.data && res.data.length > 0 && res.data[0]) {
            return res.data[0].id;
          }
          return currentId;
        });
      }
    };
    fetchList();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, statusFilter]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadConversations();
  };

  // Load messages when conversation selected
  useEffect(() => {
    let isMounted = true;

    if (!selectedConvId) {
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      const res = await getAdminConversationMessagesAction(selectedConvId);
      if (!isMounted) return;
      setLoadingMessages(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.data) {
        setMessages(res.data);
        // Clear unread count locally in list
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, admin_unread_count: 0 } : c))
        );
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedConvId]);

  // Realtime subscription for conversation updates and active chat messages
  useEffect(() => {
    const supabase = createClient();

    // 1. Listen for new messages globally or per active conversation
    const messagesChannel = supabase
      .channel("admin-messages-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;

          // If message is for currently active conversation
          if (newMsg.conversation_id === selectedConvId) {
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
          }

          // Update conversation list preview & last_message_at
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === newMsg.conversation_id);
            if (!exists) {
              loadConversations();
              return prev;
            }
            return prev
              .map((c) => {
                if (c.id === newMsg.conversation_id) {
                  return {
                    ...c,
                    last_message: newMsg.content,
                    last_message_at: newMsg.created_at,
                    admin_unread_count:
                      c.id === selectedConvId
                        ? 0
                        : newMsg.sender_role === "student"
                        ? c.admin_unread_count + 1
                        : c.admin_unread_count,
                  };
                }
                return c;
              })
              .sort(
                (a, b) =>
                  new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
              );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConvId, loadConversations]);

  // Auto-scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputMessage.trim();
    if (!content || !selectedConvId || isPending) return;

    const clientMsgId = crypto.randomUUID();
    setInputMessage("");

    startTransition(async () => {
      const res = await sendChatMessageAction({
        conversationId: selectedConvId,
        content,
        clientMsgId,
      });

      if (res.error) {
        toast.error(res.error);
        setInputMessage(content);
        return;
      }

      if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data!.id || m.client_msg_id === clientMsgId)) {
            return prev;
          }
          return [...prev, res.data!];
        });

        // Update list snippet
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId
              ? { ...c, last_message: res.data!.content, last_message_at: res.data!.created_at }
              : c
          )
        );
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (!selectedConvId) return;

    startTransition(async () => {
      const res = await updateConversationStatusAction({
        conversationId: selectedConvId,
        status: newStatus,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        newStatus === "closed"
          ? "Đã đóng cuộc hội thoại."
          : newStatus === "open"
          ? "Đã mở lại cuộc hội thoại."
          : "Đã lưu trữ cuộc hội thoại."
      );

      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConvId ? { ...c, status: newStatus } : c))
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Hộp thư hỗ trợ trực tuyến
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tiếp nhận và phản hồi câu hỏi trực tiếp từ học sinh theo thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConversations}
            disabled={loadingList}
            className="gap-2 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Main Dual-Pane Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
        {/* LEFT PANE: Conversations List (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--card)]">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-[var(--divider)] space-y-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] pl-9 pr-4 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
              />
            </form>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <Button
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                className={`h-7 px-3 text-xs rounded-lg cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Tất cả
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "open" ? "default" : "outline"}
                onClick={() => setStatusFilter("open")}
                className={`h-7 px-3 text-xs rounded-lg cursor-pointer ${
                  statusFilter === "open"
                    ? "bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Đang mở
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "closed" ? "default" : "outline"}
                onClick={() => setStatusFilter("closed")}
                className={`h-7 px-3 text-xs rounded-lg cursor-pointer ${
                  statusFilter === "closed"
                    ? "bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Đã đóng
              </Button>
            </div>
          </div>

          {/* Conversation Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--divider)] max-h-[500px]">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)] mb-2" />
                <span className="text-xs">Đang tải danh sách cuộc trò chuyện...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-[var(--muted-foreground)]">
                <Inbox className="h-10 w-10 opacity-30 mb-2" />
                <p className="text-xs font-semibold text-[var(--foreground)]">Không có cuộc trò chuyện nào</p>
                <p className="text-[11px] mt-0.5">Chưa có học sinh nào gửi yêu cầu hỗ trợ.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const hasUnread = conv.admin_unread_count > 0;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[var(--primary)]/10 border-l-4 border-l-[var(--primary)]"
                        : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] font-semibold text-xs shadow-xs">
                      {conv.student?.display_name?.charAt(0)?.toUpperCase() || "H"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-[var(--foreground)] truncate">
                          {conv.student?.display_name || "Học sinh"}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                          {new Date(conv.last_message_at).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate ${
                          hasUnread
                            ? "font-bold text-[var(--foreground)]"
                            : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        {conv.last_message || "Chưa có tin nhắn"}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                            conv.status === "open"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : conv.status === "closed"
                              ? "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {conv.status === "open"
                            ? "Đang mở"
                            : conv.status === "closed"
                            ? "Đã đóng"
                            : "Lưu trữ"}
                        </span>

                        {hasUnread && (
                          <span className="flex h-4 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white">
                            {conv.admin_unread_count} mới
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Chat View & Management (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[var(--surface)]">
          {!selectedConv ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--muted-foreground)]">
              <MessageSquare className="h-12 w-12 opacity-30 mb-3" />
              <h4 className="text-sm font-bold text-[var(--foreground)]">Chọn một cuộc trò chuyện</h4>
              <p className="text-xs max-w-sm mt-1">
                Chọn học sinh từ danh sách bên trái để xem toàn bộ lịch sử tư vấn và gửi phản hồi.
              </p>
            </div>
          ) : (
            <>
              {/* Active Conversation Top Bar */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--divider)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white font-bold text-sm shadow-xs">
                    {selectedConv.student?.display_name?.charAt(0)?.toUpperCase() || "H"}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
                      {selectedConv.student?.display_name || "Học sinh"}
                    </h3>
                    <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2">
                      <span>ID: {selectedConv.student_id.slice(0, 8)}...</span>
                      <span>•</span>
                      <span className="capitalize">{selectedConv.status}</span>
                    </p>
                  </div>
                </div>

                {/* Actions: Toggle Status */}
                <div className="flex items-center gap-2">
                  {selectedConv.status === "open" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("closed")}
                      disabled={isPending}
                      className="gap-1.5 text-xs rounded-xl border-[var(--border)] hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Đóng hội thoại
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("open")}
                      disabled={isPending}
                      className="gap-1.5 text-xs rounded-xl border-[var(--border)] hover:bg-emerald-500/10 hover:text-emerald-600 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Mở lại hội thoại
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages History Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px] min-h-[280px]">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-[var(--muted-foreground)]">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)] mb-2" />
                    <span className="text-xs">Đang tải lịch sử tin nhắn...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-[var(--muted-foreground)]">
                    <MessageSquare className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-xs">Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender_role === "admin";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div className="text-[10px] text-[var(--muted-foreground)] px-1 mb-1">
                          {isAdmin ? "Admin (Bạn)" : selectedConv.student?.display_name || "Học sinh"} •{" "}
                          {new Date(m.created_at).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(m.created_at).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </div>
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed break-words shadow-xs ${
                            isAdmin
                              ? "bg-[var(--primary)] text-white"
                              : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]"
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

              {/* Admin Reply Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3.5 border-t border-[var(--divider)] bg-[var(--card)] flex items-end gap-2.5 shrink-0"
              >
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Soạn tin nhắn trả lời học sinh (Enter để gửi, Shift+Enter xuống dòng)..."
                  disabled={isPending}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none min-h-[44px] max-h-[100px]"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputMessage.trim() || isPending}
                  className="h-10 px-4 gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md shrink-0 text-xs font-semibold cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Gửi
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
