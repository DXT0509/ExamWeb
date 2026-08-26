import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#121722] p-8 text-center shadow-2xl space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-md">
          <FileQuestion className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Không tìm thấy trang
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Đề thi này không tồn tại, đã bị xóa hoặc đường dẫn bạn truy cập hiện không khả dụng.
          </p>
        </div>
        <div className="pt-2">
          <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/30 font-semibold">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              <span>Về trang chủ</span>
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
