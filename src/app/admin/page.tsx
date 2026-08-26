import { getAdminDashboardData } from "@/lib/admin-dashboard/queries";
import { AdminDashboardUI } from "@/components/admin/dashboard-ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboardUI data={data} />;
}
