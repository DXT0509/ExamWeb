import { SectionShell } from "@/components/layouts/section-shell";
import { requireRole } from "@/lib/auth/require-user";
import { adminLinks } from "@/lib/constants/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin", "/admin");
  return <SectionShell title="Điều hướng quản trị" links={adminLinks}>{children}</SectionShell>;
}
