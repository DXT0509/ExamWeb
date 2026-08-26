import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { DashboardLayoutShell } from "@/components/layouts/dashboard-layout-shell";

export async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentProfile();

  return (
    <DashboardLayoutShell user={user} pageTitle="ExamPrep Platform">
      {children}
    </DashboardLayoutShell>
  );
}
