import { createClient } from "@/lib/supabase/server";
import { parseListParams, type SearchParamsRecord } from "@/lib/admin/types";
import type { AdminDocumentListItem, PublicDocumentItem } from "@/lib/documents/types";

export async function listAdminDocuments(searchParams: SearchParamsRecord) {
  const supabase = await createClient();
  const params = parseListParams(searchParams);
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from("documents")
    .select("id,title,slug,description,file_path,external_url,status,is_public,updated_at", { count: "exact" })
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,slug.ilike.%${params.q}%`);
  }

  if (
    params.status &&
    (params.status === "draft" ||
      params.status === "published" ||
      params.status === "archived")
  ) {
    query = query.eq("status", params.status);
  }

  if (typeof searchParams.isPublic === "string") {
    if (searchParams.isPublic === "true") {
      query = query.eq("is_public", true);
    } else if (searchParams.isPublic === "false") {
      query = query.eq("is_public", false);
    }
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("Error fetching admin documents:", error);
    return {
      items: [],
      count: 0,
      params: {
        ...params,
        isPublic: typeof searchParams?.isPublic === "string" ? searchParams.isPublic : "all",
      },
    };
  }

  return {
    items: (data ?? []) as AdminDocumentListItem[],
    count: count ?? 0,
    params: {
      ...params,
      isPublic: typeof searchParams?.isPublic === "string" ? searchParams.isPublic : "all",
    },
  };
}

export async function listPublicDocuments(filterParams?: { q?: string }) {
  const supabase = await createClient();
  const q = filterParams?.q?.trim();

  let query = supabase
    .from("documents")
    .select("id,title,slug,description,file_path,external_url,updated_at")
    .is("deleted_at", null)
    .eq("status", "published")
    .eq("is_public", true)
    .order("updated_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching public documents:", error);
    return [];
  }

  return (data ?? []) as PublicDocumentItem[];
}

export async function getDocumentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id,title,slug,description,file_path,external_url,status,is_public,updated_at,deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}
