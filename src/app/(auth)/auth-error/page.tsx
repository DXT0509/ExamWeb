import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthErrorPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Không thể xác thực</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p>Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.</p>
        <Link className="text-[var(--primary)]" href="/login">Quay lại đăng nhập</Link>
      </CardContent>
    </Card>
  );
}
