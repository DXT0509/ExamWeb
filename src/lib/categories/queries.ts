import { parseListParams, type SearchParamsRecord } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";

export async function listCategories(searchParams: SearchParamsRecord) {
  const supabase = await createClient();
  const params = parseListParams(searchParams);
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("exam_categories")
    .select("id,name,slug,description,is_active,updated_at,deleted_at", { count: "exact" })
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (params.q) query = query.or(`name.ilike.%${params.q}%,slug.ilike.%${params.q}%`);
  if (params.status === "active") query = query.eq("is_active", true);
  if (params.status === "inactive") query = query.eq("is_active", false);

  const { data, count, error } = await query;
  if (error) throw error;
  return { items: data ?? [], count: count ?? 0, params };
}

export async function listActiveCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_categories")
    .select("id,name,slug")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
