import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Kiểm tra email</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p>Vui lòng mở email xác nhận tài khoản để hoàn tất đăng ký.</p>
        <Link className="text-[var(--primary)]" href="/login">Quay lại đăng nhập</Link>
      </CardContent>
    </Card>
  );
}
