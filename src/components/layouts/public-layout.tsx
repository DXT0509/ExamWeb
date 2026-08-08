import { PublicHeader } from "@/components/navigation/public-header";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const userRole = profile?.status === "active" ? profile.role : null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicHeader userRole={userRole} />
      <main>{children}</main>
      <footer className="border-t bg-white py-6">
        <div className="container-page text-sm text-[var(--muted-foreground)]">
          ExamPrep Phase 3 - nền tảng luyện thi với dữ liệu mẫu.
        </div>
      </footer>
    </div>
  );
}
