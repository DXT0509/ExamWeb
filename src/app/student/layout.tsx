import { SectionShell } from "@/components/layouts/section-shell";
import { requireRole } from "@/lib/auth/require-user";
import { studentLinks } from "@/lib/constants/navigation";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("student", "/student");
  return <SectionShell title="Điều hướng học sinh" links={studentLinks}>{children}</SectionShell>;
}
