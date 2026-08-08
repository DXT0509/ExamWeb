import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page py-12">
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">Đề thi này không tồn tại hoặc hiện không khả dụng.</p>
      <Button asChild className="mt-4"><Link href="/">Về trang chủ</Link></Button>
    </main>
  );
}
