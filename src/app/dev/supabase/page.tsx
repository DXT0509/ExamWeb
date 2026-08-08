import { notFound } from "next/navigation";
import { safeParseClientEnv } from "@/lib/env/client";

async function checkSupabaseConnection(url: string) {
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export default async function SupabaseDevelopmentPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const envResult = safeParseClientEnv(process.env);
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const canConnect = envResult.success
    ? await checkSupabaseConnection(envResult.data.NEXT_PUBLIC_SUPABASE_URL)
    : false;

  return (
    <main className="container-page py-8">
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Kiểm tra kết nối Supabase</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Trang này chỉ khả dụng trong môi trường phát triển.</p>
        </div>
        <dl className="grid gap-3 rounded-lg border bg-white p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt>URL Supabase</dt>
            <dd>{hasUrl ? "Đã cấu hình" : "Chưa cấu hình"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Khóa công khai</dt>
            <dd>{hasAnonKey ? "Đã cấu hình" : "Chưa cấu hình"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Kết nối dịch vụ</dt>
            <dd>{canConnect ? "Thành công" : "Chưa kết nối được"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Auth service</dt>
            <dd>{canConnect ? "Có phản hồi" : "Chưa xác minh"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Môi trường</dt>
            <dd>Phát triển</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
