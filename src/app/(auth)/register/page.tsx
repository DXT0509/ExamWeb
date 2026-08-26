import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/auth-forms";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-[var(--foreground)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-blue-600/30">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">ExamPrep</span>
        </Link>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)] shadow-2xl rounded-2xl">
        <CardHeader className="text-center space-y-1.5 pb-4">
          <CardTitle className="text-2xl font-extrabold text-[var(--foreground)]">Tạo tài khoản học sinh</CardTitle>
          <CardDescription className="text-[var(--muted-foreground)] text-xs">
            Đăng ký tài khoản miễn phí để lưu lịch sử làm bài và tham gia thi thử.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
