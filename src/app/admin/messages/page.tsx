import { requireRole } from "@/lib/auth/require-user";
import { AdminMessagesUI } from "@/components/admin/messages/admin-messages-ui";

export default async function AdminMessagesPage() {
  await requireRole("admin", "/admin/messages");

  return <AdminMessagesUI />;
}
