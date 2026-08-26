import { PageHeader } from "@/components/shared/page-header";
import { StudentManagementUI } from "@/components/admin/student-management-ui";
import { requireRole } from "@/lib/auth/require-user";
import { getAdminStudents } from "@/lib/students/queries";
import { parseListParams, type SearchParamsRecord } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  await requireRole("admin", "/admin/students");

  const resolvedSearchParams = await searchParams;
  const params = parseListParams(resolvedSearchParams);
  const data = await getAdminStudents(resolvedSearchParams);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quản lý học sinh"
        description="Quản lý danh sách tài khoản học sinh, theo dõi trạng thái và khóa/mở khóa tài khoản an toàn."
        breadcrumbs={[
          { label: "Quản trị", href: "/admin" },
          { label: "Học sinh" },
        ]}
      />

      <StudentManagementUI data={data} params={params} />
    </div>
  );
}
