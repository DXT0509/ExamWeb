import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Mã tài liệu không hợp lệ." }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch document
  const { data: document, error } = await supabase
    .from("documents")
    .select("id, title, file_path, external_url, status, is_public, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !document || document.deleted_at) {
    return NextResponse.json({ error: "Không tìm thấy tài liệu." }, { status: 404 });
  }

  // Security check: If not published public, verify admin
  const isPublicPublished = document.status === "published" && document.is_public;
  if (!isPublicPublished) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập tài liệu này." },
        { status: 403 }
      );
    }
  }

  // If external URL, redirect directly
  if (document.external_url) {
    return NextResponse.redirect(document.external_url, 307);
  }

  // If file_path, generate signed URL from Supabase Storage
  if (document.file_path) {
    const filename = document.file_path.split("/").pop() || `${document.title}.pdf`;
    const { data: signedData, error: signError } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.file_path, 60, {
        download: filename,
      });

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: "Không thể tạo liên kết tải tài liệu." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(signedData.signedUrl, 307);
  }

  return NextResponse.json({ error: "Tài liệu không có nguồn tệp hợp lệ." }, { status: 400 });
}
