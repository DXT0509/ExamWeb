import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";

export default function AccountLockedPage() {
  return (
    <main className="container-page grid min-h-screen place-items-center py-12">
      <div className="grid max-w-md gap-4">
        <Alert>Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.</Alert>
        <form action={logoutAction}>
          <Button type="submit">Đăng xuất</Button>
        </form>
      </div>
    </main>
  );
}
