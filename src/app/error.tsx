"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-rose-200/80 bg-white p-8 text-center shadow-lg shadow-rose-50/50 space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Có lỗi xảy ra
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Hệ thống không thể tải dữ liệu của màn hình hiện tại. Vui lòng bấm thử lại hoặc kiểm tra kết nối mạng.
          </p>
        </div>
        <div className="pt-2">
          <Button onClick={reset} size="lg" className="w-full shadow-xs">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Thử lại</span>
          </Button>
        </div>
      </div>
    </main>
  );
}
