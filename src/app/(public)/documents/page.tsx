import { Download, ExternalLink, FileText, Globe, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { listPublicDocuments } from "@/lib/documents/queries";
import type { SearchParamsRecord } from "@/lib/admin/types";

export const metadata = {
  title: "Tài liệu học tập | ExamPrep",
  description: "Tổng hợp tài liệu ôn thi, đề cương và cẩm nang học tập công khai.",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : undefined;
  const documents = await listPublicDocuments({ q });

  return (
    <section className="space-y-8 pb-12">
      <PageHeader
        title="Tài liệu học tập"
        description="Tổng hợp tài liệu ôn thi, đề cương và cẩm nang học tập công khai dành cho mọi học sinh."
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Tài liệu" },
        ]}
        actions={
          <form className="flex w-full sm:w-auto gap-2" action="/documents">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Tìm kiếm tài liệu..."
                className="pl-10 text-sm bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <Button type="submit" variant="outline" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
              Tìm kiếm
            </Button>
          </form>
        }
      />

      {documents.length === 0 ? (
        <EmptyState
          title="Chưa có tài liệu công khai"
          description={
            q
              ? "Không tìm thấy tài liệu nào khớp với từ khóa tìm kiếm của bạn."
              : "Các tài liệu học tập đang được cập nhật và sẽ hiển thị tại đây."
          }
          action={
            q
              ? {
                  label: "Xem tất cả tài liệu",
                  href: "/documents",
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="group flex flex-col justify-between overflow-hidden border border-[var(--border)] bg-[var(--card)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 rounded-2xl"
            >
              <CardHeader className="space-y-2.5 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    className={
                      doc.external_url
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border"
                        : "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 border"
                    }
                  >
                    {doc.external_url ? (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Liên kết ngoài
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Tệp tài liệu
                      </span>
                    )}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(doc.updated_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <CardTitle
                  className="text-base font-bold text-[var(--foreground)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2"
                  title={doc.title}
                >
                  {doc.title}
                </CardTitle>

                {doc.description && (
                  <p className="line-clamp-3 text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {doc.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {doc.external_url ? (
                  <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/20">
                    <a
                      href={doc.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <span>Mở tài liệu</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Tải tài liệu</span>
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
