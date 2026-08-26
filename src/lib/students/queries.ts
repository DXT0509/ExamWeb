import { createClient } from "@/lib/supabase/server";
import { parseListParams, type SearchParamsRecord } from "@/lib/admin/types";
import type { StudentItem, StudentListResult } from "./types";

export async function getAdminStudents(
  searchParams: SearchParamsRecord
): Promise<StudentListResult> {
  const parsed = parseListParams(searchParams);
  const page = parsed.page;
  const pageSize = parsed.pageSize;
  const q = parsed.q;
  const status = parsed.status === "active" || parsed.status === "locked" ? parsed.status : "all";

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_students", {
    p_search: q || undefined,
    p_status: status,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    console.error("Error fetching admin students:", error);
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }

  const rows = data ?? [];

  const items: StudentItem[] = rows.map((row: {
    id: string;
    display_name: string | null;
    email: string;
    status: "active" | "locked";
    created_at: string;
    total_count: number;
  }) => ({
    id: row.id,
    display_name: row.display_name,
    email: row.email,
    status: row.status,
    created_at: row.created_at,
  }));

  const total = rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}
