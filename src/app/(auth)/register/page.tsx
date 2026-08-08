import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/auth-forms";

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Tạo tài khoản</CardTitle></CardHeader>
      <CardContent><RegisterForm /></CardContent>
    </Card>
  );
}
