import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Đặt lại mật khẩu</CardTitle></CardHeader>
      <CardContent>
        {user ? <ResetPasswordForm /> : <p className="text-sm text-red-600">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>}
      </CardContent>
    </Card>
  );
}
