"use client";

import { useState } from "react";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { sender: "bot" | "user"; text: string }[]
  >([
    {
      sender: "bot",
      text: "Xin chào! Bạn cần hỗ trợ về đề thi, tài liệu hay gặp sự cố kỹ thuật nào?",
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userText = message;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setMessage("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Cảm ơn bạn đã liên hệ! Đội ngũ trợ giảng ExamPrep đã ghi nhận yêu cầu và sẽ phản hồi qua email/tài khoản của bạn sớm nhất.",
        },
      ]);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Support Chat Box Popup */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)]">Trợ lý học tập trực tuyến</h4>
                <p className="text-[10px] text-[var(--accent)] font-medium">● Đang hoạt động 24/7</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="my-3 max-h-60 min-h-36 space-y-2.5 overflow-y-auto pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--card-secondary)] text-[var(--foreground)] border border-[var(--border)]"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="flex gap-2 border-t border-[var(--divider)] pt-3">
            <input
              type="text"
              placeholder="Nhập câu hỏi hỗ trợ..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
            <Button
              type="submit"
              size="sm"
              className="h-8.5 px-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-md shadow-blue-600/20"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex h-13 w-13 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-xl shadow-blue-600/30 hover:scale-105 hover:bg-[var(--primary-hover)] active:scale-95 transition-all duration-200 cursor-pointer"
        aria-label="Hỗ trợ trực tuyến"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-[var(--surface)] animate-bounce">
          1
        </span>
      </button>
    </div>
  );
}
