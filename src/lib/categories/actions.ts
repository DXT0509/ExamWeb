"use server";

import { revalidatePath } from "next/cache";
import { formBoolean, formNullableString, formString } from "@/lib/admin/form-data";
import { type ActionState, toFieldErrors } from "@/lib/admin/types";
import { requireRole } from "@/lib/auth/require-user";
import { getDatabaseErrorMessage } from "@/lib/exams/errors";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/exam";

export async function saveCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/categories");
  const parsed = categorySchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug").toLowerCase(),
    description: formNullableString(formData, "description"),
    isActive: formBoolean(formData, "isActive"),
  });
  if (!parsed.success) return { ok: false, message: "Dữ liệu danh mục chưa hợp lệ.", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const id = formString(formData, "id");
  const userId = user.id;
  const payload: { name: string; slug: string; description: string | null; is_active: boolean; updated_by: string } = {
    name: parsed.data.name ?? "",
    slug: parsed.data.slug ?? "",
    description: parsed.data.description ?? null,
    is_active: parsed.data.isActive ?? false,
    updated_by: userId,
  };
  const result = id
    ? await supabase.from("exam_categories").update(payload).eq("id", id).is("deleted_at", null)
    : await supabase.from("exam_categories").insert({ ...payload, created_by: userId });
  if (result.error) return { ok: false, message: getDatabaseErrorMessage(result.error) };
  revalidatePath("/admin/categories");
  return { ok: true, message: id ? "Đã lưu thay đổi danh mục." : "Đã tạo danh mục kỳ thi." };
}

export async function deleteCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/categories");
  const userId = user.id;
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_categories")
    .update({ deleted_at: new Date().toISOString(), is_active: false, updated_by: userId })
    .eq("id", formString(formData, "id"))
    .is("deleted_at", null);
  if (error) return { ok: false, message: getDatabaseErrorMessage(error) };
  revalidatePath("/admin/categories");
  return { ok: true, message: "Đã xóa mềm danh mục kỳ thi." };
}
