"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { FullscreenGate } from "@/components/exams/fullscreen-gate";
import { Button } from "@/components/ui/button";
import { startAttemptAction } from "@/lib/exams/attempts";

interface StartExamButtonProps {
  examId: string;
  fullscreenRequired?: boolean;
}

export function StartExamButton({ examId, fullscreenRequired = false }: StartExamButtonProps) {
  const router = useRouter();
  const [showGate, setShowGate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartDirect = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await startAttemptAction(examId);

    if (res && res.success) {
      router.push(`/attempts/${res.attemptId}`);
    } else if (res && !res.success) {
      setIsLoading(false);
      setErrorMessage(res.error || "Không thể bắt đầu bài thi. Vui lòng thử lại.");
    }
  };

  const handleButtonClick = () => {
    if (fullscreenRequired) {
      setShowGate(true);
    } else {
      handleStartDirect();
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="default"
        size="default"
        onClick={handleButtonClick}
        disabled={isLoading}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs text-base h-11 px-6"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang chuẩn bị bài thi...
          </>
        ) : (
          <>
            <Play className="mr-2 h-5 w-5 fill-current" /> Bắt đầu làm bài
          </>
        )}
      </Button>

      {errorMessage && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {showGate && (
        <FullscreenGate
          examId={examId}
          onCancel={() => setShowGate(false)}
        />
      )}
    </div>
  );
}
