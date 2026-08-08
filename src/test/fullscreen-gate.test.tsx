import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FullscreenGate } from "@/components/exams/fullscreen-gate";
import { FullscreenViolationOverlay } from "@/components/exams/fullscreen-violation-overlay";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/exams/attempts", () => ({
  startAttemptAction: vi.fn().mockResolvedValue({ success: true, attemptId: "test-attempt-123" }),
}));

describe("Fullscreen Gate Component Tests", () => {
  it("renders Fullscreen Gate with correct Vietnamese copy", () => {
    render(<FullscreenGate examId="test-exam-1" />);

    expect(screen.getByText("Bài thi yêu cầu toàn màn hình")).toBeInTheDocument();
    expect(screen.getByText("Để bắt đầu bài thi, bạn cần bật chế độ toàn màn hình.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vào chế độ toàn màn hình/i })).toBeInTheDocument();
  });

  it("displays error message if browser does not support Fullscreen API", async () => {
    render(<FullscreenGate examId="test-exam-1" fullscreenEnabledOverride={false} />);

    const button = screen.getByRole("button", { name: /Vào chế độ toàn màn hình/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Trình duyệt của bạn không hỗ trợ chế độ toàn màn hình/i)
      ).toBeInTheDocument();
    });
  });

  it("triggers requestFullscreen and starts attempt on click", async () => {
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);

    render(
      <FullscreenGate
        examId="test-exam-1"
        fullscreenEnabledOverride={true}
        requestFullscreenOverride={requestFullscreenMock}
      />
    );

    const button = screen.getByRole("button", { name: /Vào chế độ toàn màn hình/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalled();
    });
  });
});

describe("Fullscreen Violation Overlay Component Tests", () => {
  it("renders warning overlay with 5s countdown when visible", () => {
    render(
      <FullscreenViolationOverlay
        visible={true}
        violationStartedAt={Date.now()}
        onReturnToFullscreen={vi.fn()}
        onAutoSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("Bạn đã rời khỏi chế độ toàn màn hình")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng quay lại chế độ toàn màn hình.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quay lại toàn màn hình/i })).toBeInTheDocument();
  });

  it("does not render when visible is false", () => {
    const { container } = render(
      <FullscreenViolationOverlay
        visible={false}
        violationStartedAt={null}
        onReturnToFullscreen={vi.fn()}
        onAutoSubmit={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
