import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Normalizes Vietnamese text by removing diacritics and converting to lowercase slug.
 * Example: "Toán học - Ôn tập học kỳ 1" -> "toan-hoc-on-tap-hoc-ky-1"
 */
export function generateVietnameseSlug(text: string): string {
  if (!text) return "";

  let str = text.trim().toLowerCase();

  // Normalize Unicode
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace Vietnamese specific characters
  str = str
    .replace(/[đĐ]/g, "d")
    .replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, "a")
    .replace(/[éèẻẽẹêếềểễệ]/g, "e")
    .replace(/[íìỉĩị]/g, "i")
    .replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, "o")
    .replace(/[úùủũụưứừửữự]/g, "u")
    .replace(/[ýỳỷỹỵ]/g, "y");

  // Replace special characters, punctuation, whitespace with '-'
  str = str
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return str || "de-thi";
}

/**
 * Checks for collision in database and generates a unique slug (e.g. slug, slug-2, slug-3).
 */
export async function resolveUniqueExamSlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string,
  currentExamId?: string
): Promise<string> {
  const cleanBase = generateVietnameseSlug(baseSlug);
  let candidate = cleanBase;
  let counter = 1;

  while (true) {
    let query = supabase
      .from("exams")
      .select("id")
      .eq("slug", candidate)
      .is("deleted_at", null);

    if (currentExamId) {
      query = query.neq("id", currentExamId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      // If error occurs, fallback to candidate with timestamp
      return `${candidate}-${Date.now().toString().slice(-4)}`;
    }

    if (!data) {
      return candidate;
    }

    counter += 1;
    candidate = `${cleanBase}-${counter}`;
  }
}
