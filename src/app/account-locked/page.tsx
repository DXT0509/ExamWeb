import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";

export default function AccountLockedPage() {
  return (
    <main className="container-page flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl shadow-rose-50 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tài khoản đã bị khóa
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tài khoản học sinh của bạn hiện đang bị khóa bởi quản trị viên hệ thống. Các phiên thi đang thực hiện đã được chốt và tự động lưu.
          </p>
          <p className="text-xs text-slate-500 pt-1">
            Vui lòng liên hệ quản trị viên hoặc giáo viên phụ trách để được hỗ trợ mở khóa.
          </p>
        </div>
        <form action={logoutAction} className="pt-2">
          <Button type="submit" variant="destructive" size="lg" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Đăng xuất</span>
          </Button>
        </form>
      </div>
    </main>
  );
}
