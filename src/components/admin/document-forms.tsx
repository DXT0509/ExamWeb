"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionForm, ModalShell } from "@/components/admin/action-form";
import {
  deleteDocumentAction,
  saveDocumentAction,
  updateDocumentStatusAction,
} from "@/lib/documents/actions";
import { ALLOWED_DOCUMENT_EXTENSIONS, MAX_DOCUMENT_FILE_SIZE } from "@/lib/validations/document";
import type { AdminDocumentListItem } from "@/lib/documents/types";

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-24 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-focus)]"
    />
  );
}

function CheckBox({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-[var(--input-border)] text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocumentForm({
  item,
  onSuccess,
}: {
  item?: AdminDocumentListItem;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const initialSourceType = item?.external_url ? "url" : "file";
  const [sourceType, setSourceType] = useState<"file" | "url">(initialSourceType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Client-side file validation
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext as (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number])) {
      setFileError(`Định dạng tệp không được hỗ trợ (${ext}). Cho phép: ${ALLOWED_DOCUMENT_EXTENSIONS.join(", ")}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      setFileError(`Dung lượng tệp vượt quá giới hạn 25MB (${formatFileSize(file.size)})`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <ActionForm
      action={saveDocumentAction}
      onSuccess={() => {
        onSuccess?.();
        router.refresh();
      }}
      submitLabel={item ? "Lưu thay đổi" : "Tạo tài liệu"}
      pendingLabel="Đang lưu và tải lên..."
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      {item?.file_path && <input type="hidden" name="existingFilePath" value={item.file_path} />}

      <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
        Tiêu đề tài liệu
        <Input
          name="title"
          defaultValue={item?.title}
          placeholder="Ví dụ: Đề cương ôn tập Toán tư duy"
          required
          minLength={2}
          maxLength={200}
        />
      </label>

      <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
        Slug
        <Input
          name="slug"
          defaultValue={item?.slug}
          placeholder="de-cuong-on-tap-toan-tu-duy"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
        />
      </label>

      <div className="grid gap-2">
        <span className="text-sm font-medium text-[var(--foreground)]">Nguồn tài liệu</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
            <input
              type="radio"
              name="sourceType"
              value="file"
              checked={sourceType === "file"}
              onChange={() => setSourceType("file")}
              className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
            />
            Tệp tin
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
            <input
              type="radio"
              name="sourceType"
              value="url"
              checked={sourceType === "url"}
              onChange={() => setSourceType("url")}
              className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--ring)] accent-[var(--primary)]"
            />
            Liên kết bên ngoài (URL)
          </label>
        </div>
      </div>

      {sourceType === "file" ? (
        <div className="grid gap-2 rounded-2xl border border-[var(--border)] p-4 bg-[var(--card-secondary)]">
          <span className="text-sm font-medium text-[var(--foreground)]">Tệp tin tài liệu</span>
          
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl"
            >
              {selectedFile ? "Chọn tệp khác" : item?.file_path ? "Thay thế tệp" : "Chọn tệp"}
            </Button>

            {selectedFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFile}
                className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl"
              >
                Gỡ tệp
              </Button>
            )}
          </div>

          {selectedFile && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium truncate">Tệp đã chọn: {selectedFile.name}</p>
              <p className="text-blue-600 dark:text-blue-400 mt-0.5">Dung lượng: {formatFileSize(selectedFile.size)}</p>
            </div>
          )}

          {!selectedFile && item?.file_path && (
            <div className="rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] p-2.5 text-xs text-[var(--foreground)]">
              <p className="font-medium truncate">
                Tệp hiện tại: {item.file_path.split("/").pop()}
              </p>
              <p className="text-[var(--muted-foreground)] mt-0.5">Tệp cũ sẽ được giữ nguyên nếu bạn không chọn tệp mới.</p>
            </div>
          )}

          {fileError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{fileError}</p>
          )}

          <p className="text-xs text-[var(--muted-foreground)]">
            Hỗ trợ định dạng PDF, Word, Excel, PowerPoint, Text, Zip (dung lượng tối đa 25MB).
          </p>
        </div>
      ) : (
        <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
          Liên kết bên ngoài (HTTPS / HTTP)
          <Input
            name="externalUrl"
            type="url"
            defaultValue={item?.external_url ?? ""}
            placeholder="https://example.com/tai-lieu.pdf"
            required
            maxLength={1000}
          />
        </label>
      )}

      <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
        Mô tả
        <TextArea
          name="description"
          defaultValue={item?.description ?? ""}
          placeholder="Mô tả nội dung tóm tắt của tài liệu..."
          maxLength={1000}
        />
      </label>

      <label className="grid gap-1 text-sm font-medium text-[var(--foreground)]">
        Trạng thái
        <select
          name="status"
          defaultValue={item?.status ?? "draft"}
          className="h-10 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="draft">Bản nháp</option>
          <option value="published">Đã xuất bản</option>
          <option value="archived">Đã lưu trữ</option>
        </select>
      </label>

      <CheckBox
        label="Công khai (cho phép học sinh và khách truy cập)"
        name="isPublic"
        defaultChecked={item?.is_public ?? true}
      />
    </ActionForm>
  );
}

export function DocumentActions({ item }: { item: AdminDocumentListItem }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleStatusChange = async (newStatus: "draft" | "published" | "archived") => {
    const formData = new FormData();
    formData.append("id", item.id);
    formData.append("status", newStatus);
    const result = await updateDocumentStatusAction({ ok: false, message: "" }, formData);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <ModalShell
        title="Chỉnh sửa tài liệu"
        trigger={
          <Button variant="outline" size="sm" className="rounded-xl border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
            Sửa
          </Button>
        }
      >
        <DocumentForm item={item} />
      </ModalShell>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl"
            aria-label="Thao tác khác"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] rounded-xl">
          {item.status !== "published" && (
            <DropdownMenuItem onSelect={() => handleStatusChange("published")} className="hover:bg-[var(--surface-hover)]">
              Xuất bản
            </DropdownMenuItem>
          )}

          {item.status === "published" && (
            <>
              <DropdownMenuItem onSelect={() => handleStatusChange("draft")} className="hover:bg-[var(--surface-hover)]">
                Bản nháp
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleStatusChange("archived")} className="hover:bg-[var(--surface-hover)]">
                Lưu trữ
              </DropdownMenuItem>
            </>
          )}

          {item.status === "archived" && (
            <DropdownMenuItem onSelect={() => handleStatusChange("draft")} className="hover:bg-[var(--surface-hover)]">
              Bản nháp
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="bg-[var(--divider)]" />

          <DropdownMenuItem
            className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 focus:text-rose-600"
            onSelect={() => setDeleteOpen(true)}
          >
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ModalShell
        title="Xóa tài liệu?"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >
        <p className="mb-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
          Tài liệu này sẽ bị xóa và không còn hiển thị cho người dùng hoặc
          trong danh sách hoạt động.
        </p>
        <ActionForm
          action={deleteDocumentAction}
          onSuccess={() => {
            setDeleteOpen(false);
            router.refresh();
          }}
          submitLabel="Xác nhận xóa"
          pendingLabel="Đang xóa..."
        >
          <input type="hidden" name="id" value={item.id} />
        </ActionForm>
      </ModalShell>
    </div>
  );
}
