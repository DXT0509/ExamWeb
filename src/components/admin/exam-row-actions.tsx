"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionForm, ModalShell } from "@/components/admin/action-form";
import { deleteExamAction } from "@/lib/exams/actions";

interface ExamRowActionsProps {
  exam: {
    id: string;
    title: string;
    status: string;
  };
}

export function ExamRowActions({ exam }: ExamRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      <Button
        asChild
        size="sm"
        variant="outline"
        className="font-medium border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl h-8 px-3 text-xs"
      >
        <Link href={`/admin/exams/${exam.id}`} className="flex items-center gap-1.5">
          <Edit3 className="h-3.5 w-3.5" />
          <span>Soạn đề</span>
        </Link>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setDeleteOpen(true)}
        className="h-8 w-8 p-0 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl"
        aria-label={`Xóa đề thi ${exam.title}`}
        title="Xóa đề thi"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <ModalShell
        title="Xóa đề thi?"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >
        <div className="space-y-4 pt-1 text-left">
          <p className="text-sm text-[var(--foreground)] leading-relaxed text-left">
            Bạn có chắc chắn muốn xóa đề thi{" "}
            <strong className="font-semibold text-rose-600 dark:text-rose-400">
              &ldquo;{exam.title}&rdquo;
            </strong>
            ?
          </p>
          <p className="text-xs text-[var(--muted-foreground)] bg-[var(--card-secondary)] p-3 rounded-xl border border-[var(--border)] text-left">
            Đề thi sẽ bị xóa và không còn hiển thị cho học sinh cũng như trong danh sách quản trị.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              className="rounded-xl border-[var(--border)]"
            >
              Hủy
            </Button>
            <ActionForm
              action={deleteExamAction}
              onSuccess={() => setDeleteOpen(false)}
              submitLabel="Xác nhận xóa"
              pendingLabel="Đang xóa..."
              buttonVariant="destructive"
              buttonClassName="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-600/20"
            >
              <input type="hidden" name="id" value={exam.id} />
            </ActionForm>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
