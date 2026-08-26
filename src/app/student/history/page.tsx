import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentHistoryUI } from "@/components/student/student-history-ui";
import { getStudentHistory, type HistoryFilter, type HistorySort, type PaginatedStudentHistory } from "@/lib/exams/history-queries";

export const revalidate = 0;

interface HistoryPageProps {
  searchParams: Promise<{
    page?: string;
    filter?: string;
    sort?: string;
  }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;

  const page = parseInt(params.page || "1", 10);
  const filter = (["all", "submitted", "time_expired", "fullscreen_violation"].includes(params.filter || "")
    ? params.filter
    : "all") as HistoryFilter;
  const sort = (["newest", "oldest", "highest_score", "lowest_score"].includes(params.sort || "")
    ? params.sort
    : "newest") as HistorySort;

  let historyData: PaginatedStudentHistory | null = null;
  let fetchError = false;

  try {
    historyData = await getStudentHistory({
      page,
      filter,
      sort,
      pageSize: 20,
    });
  } catch (err: unknown) {
    console.error("Lỗi khi tải trang lịch sử làm bài:", err);
    fetchError = true;
  }

  if (fetchError || !historyData) {
    return (
      <main className="py-12 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-red-200 bg-red-50/30 dark:bg-red-950/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" /> Không thể tải lịch sử làm bài
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Đã xảy ra lỗi trong quá trình lấy thông tin bài làm. Vui lòng thử lại sau.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/student/history">
                  <RefreshCw className="mr-2 h-4 w-4" /> Thử lại
                </Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/exams">Danh sách đề thi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <StudentHistoryUI historyData={historyData} currentFilter={filter} currentSort={sort} />;
}
