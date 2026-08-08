import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Quên mật khẩu</CardTitle></CardHeader>
      <CardContent><ForgotPasswordForm /></CardContent>
    </Card>
  );
}
