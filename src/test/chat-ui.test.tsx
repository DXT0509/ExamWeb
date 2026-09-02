import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SUPPORT_FAQS } from "@/lib/constants/faq";
import { FloatingSupport } from "@/components/navigation/floating-support";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}));

// Mock chat actions
vi.mock("@/lib/chat/actions", () => ({
  getOrCreateStudentConversationAction: vi.fn().mockResolvedValue({ data: null }),
  getStudentChatHistoryAction: vi.fn().mockResolvedValue({ data: [] }),
  markConversationReadAction: vi.fn().mockResolvedValue({ data: true }),
  sendChatMessageAction: vi.fn().mockResolvedValue({ data: null }),
}));

describe("Support Chat UI & FAQ Constants", () => {
  it("provides 3 representative and authentic system FAQs", () => {
    expect(SUPPORT_FAQS).toHaveLength(3);

    const faq1 = SUPPORT_FAQS[0]!;
    const faq2 = SUPPORT_FAQS[1]!;
    const faq3 = SUPPORT_FAQS[2]!;

    expect(faq1.id).toBe("faq-start-exam");
    expect(faq1.question).toContain("bắt đầu làm một đề thi");
    expect(faq1.answer).not.toContain("Lorem");

    expect(faq2.id).toBe("faq-auto-submitted");
    expect(faq2.question).toContain("tự động nộp");
    expect(faq2.answer).toContain("toàn màn hình");

    expect(faq3.id).toBe("faq-view-results");
    expect(faq3.question).toContain("lịch sử");
    expect(faq3.answer).toContain("/student/history");
  });

  it("does not render FloatingSupport when userRole is admin", async () => {
    let container: HTMLElement;
    await act(async () => {
      const res = render(<FloatingSupport userRole="admin" />);
      container = res.container;
    });
    expect(container!).toBeEmptyDOMElement();
  });

  it("renders FloatingSupport trigger button for student or guest", async () => {
    await act(async () => {
      render(<FloatingSupport userRole="student" />);
    });
    const triggerBtn = screen.getByRole("button", { name: /trợ lý học tập trực tuyến/i });
    expect(triggerBtn).toBeInTheDocument();
  });
});

