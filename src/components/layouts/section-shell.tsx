import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { DashboardLayoutShell } from "@/components/layouts/dashboard-layout-shell";

export async function SectionShell({
  children,
  title,
  pageTitle,
  breadcrumbs,
}: {
  children: React.ReactNode;
  title?: string;
  links?: { href: string; label: string }[];
  pageTitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  const user = await getCurrentProfile();

  return (
    <DashboardLayoutShell
      user={user}
      pageTitle={pageTitle || title}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </DashboardLayoutShell>
  );
}
