import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { ExamResultUI } from "@/components/exams/exam-result-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAttemptResultAction } from "@/lib/exams/attempts";

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;

  const res = await getAttemptResultAction(attemptId);

  if (!res.success) {
    return (
      <main className="container-page py-12 flex items-center justify-center min-h-[70vh] px-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50/30 dark:bg-red-950/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" /> Không thể xem kết quả
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">{res.error}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/student/history">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại lịch sử
                </Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/exams">Mở thư viện đề thi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <ExamResultUI result={res.result} />;
}
