import { ProfileForm } from "@/components/auth/auth-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-user";

function roleLabel(role: "student" | "admin") {
  return role === "admin" ? "Quản trị viên" : "Học sinh";
}

function statusLabel(status: "active" | "locked") {
  return status === "active" ? "Đang hoạt động" : "Đã bị khóa";
}

export default async function ProfilePage() {
  const { user, profile } = await requireRole("student", "/student/profile");

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Hồ sơ cá nhân</CardTitle></CardHeader>
      <CardContent className="grid gap-6">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="font-medium">Địa chỉ email</dt><dd>{user.email}</dd></div>
          <div><dt className="font-medium">Vai trò</dt><dd>{roleLabel(profile.role)}</dd></div>
          <div><dt className="font-medium">Trạng thái tài khoản</dt><dd>{statusLabel(profile.status)}</dd></div>
          <div><dt className="font-medium">Ngày tạo</dt><dd>{new Intl.DateTimeFormat("vi-VN").format(new Date(profile.created_at))}</dd></div>
        </dl>
        <ProfileForm displayName={profile.display_name ?? ""} />
      </CardContent>
    </Card>
  );
}
