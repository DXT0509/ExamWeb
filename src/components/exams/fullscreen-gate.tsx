"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startAttemptAction } from "@/lib/exams/attempts";

interface FullscreenGateProps {
  examId: string;
  onCancel?: () => void;
  /** Optional requestFullscreen override for unit testing */
  requestFullscreenOverride?: () => Promise<void>;
  /** Optional fullscreenEnabled override for unit testing */
  fullscreenEnabledOverride?: boolean;
}

export function FullscreenGate({
  examId,
  onCancel,
  requestFullscreenOverride,
  fullscreenEnabledOverride,
}: FullscreenGateProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEnterFullscreenAndStart = async () => {
    setErrorMessage(null);

    // 1. Check browser support
    const isSupported =
      fullscreenEnabledOverride !== undefined
        ? fullscreenEnabledOverride
        : typeof document !== "undefined" && Boolean(document.fullscreenEnabled);

    if (!isSupported) {
      setErrorMessage(
        "Trình duyệt của bạn không hỗ trợ chế độ toàn màn hình. Vui lòng sử dụng trình duyệt hiện đại như Chrome, Edge, Firefox hoặc Safari."
      );
      return;
    }

    setIsLoading(true);

    try {
      // 2. Request browser fullscreen
      if (requestFullscreenOverride) {
        await requestFullscreenOverride();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setIsLoading(false);
      setErrorMessage("Không thể bật chế độ toàn màn hình. Vui lòng thử lại.");
      return;
    }

    // Verify fullscreen is active
    const isFullscreenActive =
      requestFullscreenOverride !== undefined || Boolean(document.fullscreenElement);

    if (!isFullscreenActive) {
      setIsLoading(false);
      setErrorMessage("Không thể bật chế độ toàn màn hình. Vui lòng thử lại.");
      return;
    }

    // 3. Start attempt AFTER fullscreen success
    const res = await startAttemptAction(examId);
    if (res && res.success) {
      router.push(`/attempts/${res.attemptId}`);
    } else {
      setIsLoading(false);
      setErrorMessage(res?.error || "Không thể bắt đầu bài thi. Vui lòng thử lại.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-gate-title"
    >
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Maximize2 className="h-7 w-7" />
          </div>
          <CardTitle id="fullscreen-gate-title" className="text-xl font-bold">
            Bài thi yêu cầu toàn màn hình
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Để bắt đầu bài thi, bạn cần bật chế độ toàn màn hình.
          </p>
          <p className="text-xs leading-relaxed text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 p-3 rounded-md border border-amber-200 dark:border-amber-800">
            Trong quá trình làm bài, nếu bạn rời khỏi chế độ này, bài thi sẽ cảnh báo và có thể tự động nộp.
          </p>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-left text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="default"
              size="default"
              onClick={handleEnterFullscreenAndStart}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang chuẩn bị bài thi...
                </>
              ) : (
                <>
                  <Maximize2 className="mr-2 h-5 w-5" /> Vào chế độ toàn màn hình
                </>
              )}
            </Button>

            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
                Hủy bỏ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
