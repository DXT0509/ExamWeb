import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { documentSchema } from "@/lib/validations/document";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    const key = match?.[1];
    const value = match?.[2];
    if (key && value !== undefined && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function client(key = anonKey) {
  return createClient<Database>(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `test-${crypto.randomUUID()}` },
  });
}

async function signedIn(email: string, password: string) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return supabase;
}

describe("documents management schema, RLS, and validation", () => {
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để chạy integration test Supabase local.");
  }

  it("enforces documents visibility rules by role and status", async () => {
    const guest = client();
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");

    // Guest can only select published + is_public documents
    const { data: guestDocs, error: guestError } = await guest.from("documents").select("slug, status, is_public");
    expect(guestError).toBeNull();
    expect(guestDocs?.length).toBeGreaterThanOrEqual(2);
    expect(guestDocs).toContainEqual({ slug: "de-cuong-on-tap-toan-tu-duy", status: "published", is_public: true });
    expect(guestDocs).toContainEqual({ slug: "cam-nang-huong-dan-lam-bai-doc-hieu", status: "published", is_public: true });
    // Guest cannot see draft
    expect(guestDocs?.some((d) => d.slug === "tai-lieu-nhap-noi-bo")).toBe(false);
    // Guest cannot see archived
    expect(guestDocs?.some((d) => d.slug === "tai-lieu-luu-tru-cu")).toBe(false);
    // Guest cannot see private document even if published
    expect(guestDocs?.some((d) => d.slug === "tai-lieu-noi-bo-rieng-tu")).toBe(false);

    // Student can also only select published + is_public documents
    const { data: studentDocs, error: studentError } = await student.from("documents").select("slug, status, is_public");
    expect(studentError).toBeNull();
    expect(studentDocs).toContainEqual({ slug: "de-cuong-on-tap-toan-tu-duy", status: "published", is_public: true });
    expect(studentDocs?.some((d) => d.slug === "tai-lieu-nhap-noi-bo")).toBe(false);
    expect(studentDocs?.some((d) => d.slug === "tai-lieu-luu-tru-cu")).toBe(false);
    expect(studentDocs?.some((d) => d.slug === "tai-lieu-noi-bo-rieng-tu")).toBe(false);

    // Admin can select all documents
    const { data: adminDocs, error: adminError } = await admin.from("documents").select("slug");
    expect(adminError).toBeNull();
    expect(adminDocs?.length).toBeGreaterThanOrEqual(5);
  });

  it("allows admin to create, edit, publish, archive, and soft-delete a document", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const { data: adminUser } = await admin.auth.getUser();
    expect(adminUser.user).not.toBeNull();
    const adminId = adminUser.user!.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const slug = `tai-lieu-kiem-thu-${suffix}`;

    // 1. Create draft document with external URL
    const { data: createdDoc, error: createError } = await admin
      .from("documents")
      .insert({
        title: "Tài liệu kiểm thử tích hợp",
        slug,
        description: "Mô tả tài liệu kiểm thử",
        external_url: "https://example.test/doc-test.pdf",
        status: "draft",
        is_public: true,
        created_by: adminId,
        updated_by: adminId,
      })
      .select()
      .single();

    expect(createError).toBeNull();
    expect(createdDoc).not.toBeNull();
    expect(createdDoc?.slug).toBe(slug);
    expect(createdDoc?.status).toBe("draft");

    const createdId = createdDoc!.id;

    // 2. Edit document
    const { data: updatedDoc, error: updateError } = await admin
      .from("documents")
      .update({
        title: "Tài liệu kiểm thử tích hợp đã cập nhật",
        description: "Mô tả mới",
      })
      .eq("id", createdId)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updatedDoc?.title).toBe("Tài liệu kiểm thử tích hợp đã cập nhật");

    // 3. Publish document
    const { data: publishedDoc, error: publishError } = await admin
      .from("documents")
      .update({ status: "published" })
      .eq("id", createdId)
      .select()
      .single();

    expect(publishError).toBeNull();
    expect(publishedDoc?.status).toBe("published");

    // Guest should now be able to see it
    const guest = client();
    const { data: guestFind } = await guest.from("documents").select("id").eq("id", createdId);
    expect(guestFind?.length).toBe(1);

    // 4. Archive document
    const { data: archivedDoc, error: archiveError } = await admin
      .from("documents")
      .update({ status: "archived" })
      .eq("id", createdId)
      .select()
      .single();

    expect(archiveError).toBeNull();
    expect(archivedDoc?.status).toBe("archived");

    // Guest should no longer see it
    const { data: guestFindArchived } = await guest.from("documents").select("id").eq("id", createdId);
    expect(guestFindArchived?.length).toBe(0);

    // 5. Soft-delete document
    const { error: deleteError } = await admin
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", createdId);

    expect(deleteError).toBeNull();

    // Admin should see it with deleted_at set
    const { data: softDeleted } = await admin.from("documents").select("deleted_at").eq("id", createdId).single();
    expect(softDeleted?.deleted_at).not.toBeNull();
  });

  it("enforces database source constraint (requires exactly one of file_path or external_url)", async () => {
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");
    const { data: adminUser } = await admin.auth.getUser();
    const adminId = adminUser.user!.id;

    // Both provided -> fails
    const { error: bothError } = await admin.from("documents").insert({
      title: "Tài liệu lỗi cả hai nguồn",
      slug: `err-both-${crypto.randomUUID().slice(0, 8)}`,
      file_path: "/uploads/doc.pdf",
      external_url: "https://example.test/doc.pdf",
      created_by: adminId,
    });
    expect(bothError).not.toBeNull();

    // Neither provided -> fails
    const { error: noneError } = await admin.from("documents").insert({
      title: "Tài liệu lỗi không có nguồn",
      slug: `err-none-${crypto.randomUUID().slice(0, 8)}`,
      file_path: null,
      external_url: null,
      created_by: adminId,
    });
    expect(noneError).not.toBeNull();
  });

  it("validates document schema correctly with Zod", () => {
    // Valid file source
    const validFile = documentSchema.safeParse({
      title: "Đề cương Toán 12",
      slug: "de-cuong-toan-12",
      description: "Tài liệu ôn thi",
      sourceType: "file",
      filePath: "/uploads/toan12.pdf",
      status: "published",
      isPublic: true,
    });
    expect(validFile.success).toBe(true);

    // Valid URL source
    const validUrl = documentSchema.safeParse({
      title: "Đề cương Văn 12",
      slug: "de-cuong-van-12",
      description: "Tài liệu ôn thi",
      sourceType: "url",
      externalUrl: "https://drive.google.com/file/d/xyz",
      status: "draft",
      isPublic: false,
    });
    expect(validUrl.success).toBe(true);

    // Invalid: both sources
    const bothSources = documentSchema.safeParse({
      title: "Tài liệu lỗi",
      slug: "tai-lieu-loi",
      sourceType: "file",
      filePath: "/uploads/toan12.pdf",
      externalUrl: "https://example.com/doc.pdf",
      status: "draft",
      isPublic: true,
    });
    expect(bothSources.success).toBe(false);

    // Invalid: missing source
    const missingSource = documentSchema.safeParse({
      title: "Tài liệu thiếu nguồn",
      slug: "tai-lieu-thieu-nguon",
      sourceType: "url",
      status: "draft",
      isPublic: true,
    });
    expect(missingSource.success).toBe(false);

    // Invalid: dangerous javascript: protocol
    const dangerousUrl = documentSchema.safeParse({
      title: "Tài liệu URL nguy hiểm",
      slug: "tai-lieu-url-nguy-hiem",
      sourceType: "url",
      externalUrl: "javascript:alert(1)",
      status: "published",
      isPublic: true,
    });
    expect(dangerousUrl.success).toBe(false);
  });

  it("prevents Student and Guest from mutating documents", async () => {
    const guest = client();
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const { data: studentUser } = await student.auth.getUser();
    const studentId = studentUser.user!.id;

    // Student insert -> denied by RLS
    const { error: studentInsertError } = await student.from("documents").insert({
      title: "Student tự tạo tài liệu",
      slug: `student-doc-${crypto.randomUUID().slice(0, 8)}`,
      external_url: "https://example.test/hack.pdf",
      created_by: studentId,
    });
    expect(studentInsertError).not.toBeNull();

    // Guest insert -> denied by RLS
    const { error: guestInsertError } = await guest.from("documents").insert({
      title: "Guest tự tạo tài liệu",
      slug: `guest-doc-${crypto.randomUUID().slice(0, 8)}`,
      external_url: "https://example.test/guest.pdf",
      created_by: studentId,
    });
    expect(guestInsertError).not.toBeNull();
  });

  it("enforces storage security policies on documents bucket", async () => {
    const guest = client();
    const student = await signedIn("student1@example.test", "LocalStudent123!");
    const admin = await signedIn("admin@example.test", "LocalAdmin123!");

    const testBuffer = Buffer.from("PDF test content");
    const testPath = `uploads/test-${crypto.randomUUID()}.pdf`;

    // 1. Guest upload -> rejected by Storage RLS
    const { error: guestUploadError } = await guest.storage
      .from("documents")
      .upload(testPath, testBuffer, { contentType: "application/pdf" });
    expect(guestUploadError).not.toBeNull();

    // 2. Student upload -> rejected by Storage RLS
    const { error: studentUploadError } = await student.storage
      .from("documents")
      .upload(testPath, testBuffer, { contentType: "application/pdf" });
    expect(studentUploadError).not.toBeNull();

    // 3. Admin upload -> allowed
    const { error: adminUploadError } = await admin.storage
      .from("documents")
      .upload(testPath, testBuffer, { contentType: "application/pdf" });
    expect(adminUploadError).toBeNull();

    // 4. Admin clean up file
    const { error: adminDeleteError } = await admin.storage
      .from("documents")
      .remove([testPath]);
    expect(adminDeleteError).toBeNull();
  });
});
