import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ExamTakingUI } from "@/components/exams/exam-taking-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAttemptPayloadAction } from "@/lib/exams/attempts";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;

  const res = await getAttemptPayloadAction(attemptId);

  if (!res.success) {
    return (
      <main className="container-page py-12 flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md border-red-200 bg-red-50/30 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" /> Không thể vào bài thi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">{res.error}</p>
            <Button asChild variant="outline">
              <Link href="/exams">Quay lại danh sách đề thi</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { payload } = res;

  // If already submitted/finalized, redirect to result page directly
  if (payload.status !== "in_progress") {
    redirect(`/attempts/${attemptId}/result`);
  }

  return <ExamTakingUI initialPayload={payload} />;
}
