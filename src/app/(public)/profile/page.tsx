import { Mail, Shield, UserCheck, Calendar } from "lucide-react";
import { ProfileForm } from "@/components/auth/auth-forms";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";

function roleLabel(role: "student" | "admin") {
  return role === "admin" ? "Quản trị viên" : "Học sinh";
}

export const metadata = {
  title: "Hồ sơ cá nhân | ExamPrep",
  description: "Xem và quản lý thông tin tài khoản của bạn trên nền tảng ExamPrep.",
};

export default async function ProfilePage() {
  const { user, profile } = await requireUser("/profile");

  return (
    <div className="space-y-8 max-w-3xl pb-12">
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Xem và quản lý thông tin tài khoản của bạn."
        breadcrumbs={[
          { label: profile.role === "admin" ? "Quản trị" : "Không gian học tập", href: profile.role === "admin" ? "/admin" : "/student" },
          { label: "Hồ sơ cá nhân" },
        ]}
      />

      <Card className="border-[var(--border)] bg-[var(--card)] shadow-lg shadow-black/5 rounded-2xl">
        <CardHeader className="border-b border-[var(--divider)] pb-4">
          <CardTitle className="text-base font-bold text-[var(--foreground)]">
            Thông tin tài khoản
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                <Mail className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>Địa chỉ email</span>
              </div>
              <p className="text-sm font-bold text-[var(--foreground)] break-all">{user.email}</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                <Shield className="h-3.5 w-3.5 text-[var(--purple)]" />
                <span>Vai trò hệ thống</span>
              </div>
              <p className="text-sm font-bold text-[var(--foreground)]">{roleLabel(profile.role)}</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                <UserCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Trạng thái tài khoản</span>
              </div>
              <div className="mt-1">
                <StatusBadge status={profile.status} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                <Calendar className="h-3.5 w-3.5 text-[var(--warning)]" />
                <span>Ngày tham gia</span>
              </div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {new Intl.DateTimeFormat("vi-VN").format(new Date(profile.created_at))}
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--divider)] pt-5">
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-3">Cập nhật tên hiển thị</h3>
            <ProfileForm displayName={profile.display_name ?? ""} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
