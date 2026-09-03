"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-user";
import { formBoolean, formNullableString, formString } from "@/lib/admin/form-data";
import { type ActionState, toFieldErrors } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDatabaseErrorMessage } from "@/lib/exams/errors";
import {
  documentSchema,
  documentStatusSchema,
  validateDocumentFile,
} from "@/lib/validations/document";

export async function saveDocumentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/documents");
  const sourceType = formString(formData, "sourceType");
  const externalUrl = formNullableString(formData, "externalUrl");
  const documentId = formNullableString(formData, "id");
  const existingFilePath = formNullableString(formData, "existingFilePath");

  const file = formData.get("file") as File | null;
  const hasNewFile = file instanceof File && file.size > 0;

  let filePathToSave: string | null = null;
  let oldFilePathToDelete: string | null = null;

  const supabase = await createClient();

  if (sourceType === "file") {
    if (hasNewFile) {
      // Validate file
      const validation = validateDocumentFile(file);
      if (!validation.ok) {
        return {
          ok: false,
          message: validation.error,
          fieldErrors: { filePath: validation.error },
        };
      }

      // Safe filename with uuid
      const safeName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/_{2,}/g, "_");
      const storagePath = `uploads/${crypto.randomUUID()}-${safeName}`;

      // Upload file to Supabase Storage
      const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : supabase;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await storageClient.storage
        .from("documents")
        .upload(storagePath, fileBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return {
          ok: false,
          message: `Không thể tải tệp lên: ${uploadError.message}`,
        };
      }

      filePathToSave = storagePath;
      if (existingFilePath && existingFilePath !== storagePath) {
        oldFilePathToDelete = existingFilePath;
      }
    } else if (documentId && existingFilePath) {
      // Editing without changing file -> retain existing
      filePathToSave = existingFilePath;
    } else {
      return {
        ok: false,
        message: "Vui lòng chọn tệp tin tải lên.",
        fieldErrors: { filePath: "Vui lòng chọn tệp tin tải lên." },
      };
    }
  } else if (sourceType === "url") {
    filePathToSave = null;
    if (existingFilePath) {
      oldFilePathToDelete = existingFilePath;
    }
  }

  const parsed = documentSchema.safeParse({
    id: documentId ?? undefined,
    title: formString(formData, "title"),
    slug: formString(formData, "slug").toLowerCase(),
    description: formNullableString(formData, "description"),
    sourceType: sourceType === "url" ? "url" : "file",
    filePath: filePathToSave,
    externalUrl: sourceType === "url" ? externalUrl : null,
    status: formString(formData, "status") || "draft",
    isPublic: formBoolean(formData, "isPublic"),
  });

  if (!parsed.success) {
    if (hasNewFile && filePathToSave) {
      const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : supabase;
      await storageClient.storage.from("documents").remove([filePathToSave]);
    }
    return {
      ok: false,
      message: "Dữ liệu tài liệu chưa hợp lệ.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const payload = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    description: parsed.data.description ?? null,
    file_path: parsed.data.filePath,
    external_url: parsed.data.externalUrl,
    status: parsed.data.status,
    is_public: parsed.data.isPublic,
    updated_by: user.id,
  };

  const result = documentId
    ? await supabase
        .from("documents")
        .update(payload)
        .eq("id", documentId)
        .is("deleted_at", null)
    : await supabase
        .from("documents")
        .insert({ ...payload, created_by: user.id });

  if (result.error) {
    if (hasNewFile && filePathToSave) {
      const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : supabase;
      await storageClient.storage.from("documents").remove([filePathToSave]);
    }
    return { ok: false, message: getDatabaseErrorMessage(result.error) };
  }

  if (oldFilePathToDelete) {
    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;
    await storageClient.storage.from("documents").remove([oldFilePathToDelete]);
  }

  revalidatePath("/admin/documents");
  revalidatePath("/documents");

  return {
    ok: true,
    message: documentId ? "Đã lưu thay đổi tài liệu." : "Đã tạo tài liệu mới.",
  };
}

export async function deleteDocumentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/documents");
  const id = formString(formData, "id");
  if (!id) {
    return { ok: false, message: "Mã tài liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    return { ok: false, message: getDatabaseErrorMessage(error) };
  }

  revalidatePath("/admin/documents");
  revalidatePath("/documents");

  return { ok: true, message: "Đã xóa tài liệu." };
}

export async function updateDocumentStatusAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireRole("admin", "/admin/documents");
  const parsed = documentStatusSchema.safeParse({
    id: formString(formData, "id"),
    status: formString(formData, "status"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Trạng thái tài liệu không hợp lệ.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      status: parsed.data.status,
      updated_by: user.id,
    })
    .eq("id", parsed.data.id)
    .is("deleted_at", null);

  if (error) {
    return { ok: false, message: getDatabaseErrorMessage(error) };
  }

  revalidatePath("/admin/documents");
  revalidatePath("/documents");

  const statusLabel =
    parsed.data.status === "published"
      ? "Đã xuất bản tài liệu."
      : parsed.data.status === "archived"
      ? "Đã lưu trữ tài liệu."
      : "Đã chuyển tài liệu về bản nháp.";

  return { ok: true, message: statusLabel };
}
