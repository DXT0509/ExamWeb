"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-user";
import type { ActionState } from "@/lib/admin/types";

const toggleLockSchema = z.object({
  studentId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "ID học sinh không hợp lệ"),
  targetStatus: z.enum(["active", "locked"]),
});

export async function toggleStudentLockAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin", "/admin/students");

  const studentId = formData.get("studentId");
  const targetStatus = formData.get("targetStatus");

  const parsed = toggleLockSchema.safeParse({ studentId, targetStatus });
  if (!parsed.success) {
    return { ok: false, message: "Dữ liệu không hợp lệ" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("toggle_student_lock", {
    p_student_id: parsed.data.studentId,
    p_target_status: parsed.data.targetStatus,
  });

  if (error) {
    console.error("Error toggling student lock:", error);
    return { ok: false, message: "Lỗi hệ thống khi cập nhật trạng thái tài khoản" };
  }

  const result = data?.[0];
  if (!result || !result.success) {
    const code = result?.code;
    if (code === "STUDENT_NOT_FOUND") {
      return { ok: false, message: "Không tìm thấy học sinh" };
    }
    if (code === "INVALID_ROLE") {
      return { ok: false, message: "Tài khoản không phải là học sinh" };
    }
    return { ok: false, message: "Không thể cập nhật trạng thái tài khoản" };
  }

  revalidatePath("/admin/students");

  const actionText = parsed.data.targetStatus === "locked" ? "Khóa" : "Mở khóa";
  const autoSubmittedInfo =
    result.attempts_auto_submitted > 0
      ? ` (Đã tự động nộp ${result.attempts_auto_submitted} bài thi đang làm)`
      : "";

  return {
    ok: true,
    message: `Đã ${actionText.toLowerCase()} tài khoản thành công${autoSubmittedInfo}`,
  };
}
