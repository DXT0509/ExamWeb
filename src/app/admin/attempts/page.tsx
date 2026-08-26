import { AttemptManagementUI } from "@/components/admin/attempt-management-ui";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/require-user";
import { getAdminAttempts, getAdminFilterOptions } from "@/lib/attempts/queries";
import type { SearchParamsRecord } from "@/lib/admin/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  await requireRole("admin", "/admin/attempts");

  const resolvedSearchParams = await searchParams;
  const data = await getAdminAttempts(resolvedSearchParams);
  const filterOptions = await getAdminFilterOptions();

  const params = {
    q: typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "",
    subjectId: typeof resolvedSearchParams.subjectId === "string" ? resolvedSearchParams.subjectId : "all",
    examId: typeof resolvedSearchParams.examId === "string" ? resolvedSearchParams.examId : "all",
    status: typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "all",
    submitReason: typeof resolvedSearchParams.submitReason === "string" ? resolvedSearchParams.submitReason : "all",
    page: Number(resolvedSearchParams.page) || 1,
    pageSize: Number(resolvedSearchParams.pageSize) || 10,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quản lý lượt thi"
        description="Giám sát và kiểm tra chi tiết các lượt thi của học sinh và khách trên toàn hệ thống."
        breadcrumbs={[
          { label: "Quản trị", href: "/admin" },
          { label: "Lượt thi" },
        ]}
      />

      <AttemptManagementUI
        data={data}
        params={params}
        subjects={filterOptions.subjects}
        exams={filterOptions.exams}
      />
    </div>
  );
}
