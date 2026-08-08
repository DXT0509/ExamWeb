"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenViolationOverlayProps {
  visible: boolean;
  violationStartedAt: number | null; // Date.now() timestamp when violation started
  onReturnToFullscreen: () => Promise<void>;
  onAutoSubmit: () => void;
  isAutoSubmitting?: boolean;
}

export function FullscreenViolationOverlay({
  visible,
  violationStartedAt,
  onReturnToFullscreen,
  onAutoSubmit,
  isAutoSubmitting = false,
}: FullscreenViolationOverlayProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(5);
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !violationStartedAt) return;

    const deadline = violationStartedAt + 5000;

    const updateCountdown = () => {
      const remainingMs = deadline - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setRemainingSeconds(remainingSec);

      if (remainingMs <= 0) {
        onAutoSubmit();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 200);

    return () => clearInterval(interval);
  }, [visible, violationStartedAt, onAutoSubmit]);

  if (!visible) return null;

  const handleReturnClick = async () => {
    setIsReturning(true);
    setReturnError(null);
    try {
      await onReturnToFullscreen();
    } catch {
      setReturnError("Không thể bật lại chế độ toàn màn hình. Vui lòng thử lại.");
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 text-white backdrop-blur-md animate-in fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fullscreen-violation-title"
      aria-describedby="fullscreen-violation-desc"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-slate-950 shadow-2xl dark:bg-slate-900 dark:text-slate-100 text-center space-y-5 border border-red-200 dark:border-red-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 animate-pulse">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h2 id="fullscreen-violation-title" className="text-xl font-bold text-red-600 dark:text-red-400">
          Bạn đã rời khỏi chế độ toàn màn hình
        </h2>

        <p id="fullscreen-violation-desc" className="text-sm text-slate-700 dark:text-slate-300 font-medium">
          Vui lòng quay lại chế độ toàn màn hình.
        </p>

        {isAutoSubmitting ? (
          <div className="py-3 text-center space-y-2">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" />
            <p className="text-base font-bold text-amber-700 dark:text-amber-400">
              Bài thi đang được tự động nộp...
            </p>
          </div>
        ) : (
          <div className="py-2 space-y-1">
            <div className="text-4xl font-extrabold font-mono text-red-600 dark:text-red-400">
              {remainingSeconds} <span className="text-base font-normal">giây</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bài thi sẽ tự động nộp nếu bạn không quay lại.
            </p>
          </div>
        )}

        {returnError && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-2 rounded border border-red-200 dark:border-red-900">
            {returnError}
          </p>
        )}

        <Button
          onClick={handleReturnClick}
          disabled={isReturning || isAutoSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 text-base shadow-md"
        >
          {isReturning ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang chuyển toàn màn hình...
            </>
          ) : (
            <>
              <Maximize2 className="mr-2 h-5 w-5" /> Quay lại toàn màn hình
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
