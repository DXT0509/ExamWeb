import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({ title }: { title: string }) {
  return <Alert>{title}</Alert>;
}

export function ErrorState() {
  return (
    <Alert className="flex items-center justify-between gap-3">
      <span>Không thể tải danh sách đề thi. Vui lòng thử lại sau.</span>
      <Button variant="outline" size="sm">Thử lại</Button>
    </Alert>
  );
}

export function LoadingRows() {
  return (
    <div className="grid gap-3" aria-label="Đang tải">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  );
}
