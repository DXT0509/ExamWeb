"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getHomePathForRole, getSafeNextPath } from "@/lib/auth/redirects";
import { forgotPasswordSchema, loginSchema, profileSchema, registerSchema, resetPasswordSchema } from "@/lib/validations/auth";

export type ActionState = { error?: string; success?: string };

function firstError(result: { error: { issues: { message: string }[] } }) {
  return result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return { error: firstError(parsed) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/student`,
    },
  });

  if (error) return { error: "Không thể tạo tài khoản lúc này. Vui lòng thử lại." };
  if (!data.session) redirect("/check-email");

  redirect("/student");
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: firstError(parsed) };

  const next = getSafeNextPath(formData.get("next"), "/student");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Email hoặc mật khẩu không đúng." };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Không thể đăng nhập lúc này. Vui lòng thử lại." };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
  if (!profile) return { error: "Không thể tải hồ sơ tài khoản. Vui lòng thử lại." };

  if (profile.status === "locked") {
    await supabase.auth.signOut();
    redirect("/account-locked");
  }

  redirect(next === "/student" ? getHomePathForRole(profile.role) : next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: firstError(parsed) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  return {
    success:
      "Nếu địa chỉ email này tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
  };
}

export async function resetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: firstError(parsed) };

  const user = await getCurrentUser();
  if (!user) return { error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại." };

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}

export async function updateProfileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) return { error: firstError(parsed) };

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id);
  if (error) return { error: "Không thể cập nhật hồ sơ lúc này. Vui lòng thử lại." };

  revalidatePath("/student/profile");
  return { success: "Đã cập nhật hồ sơ." };
}

export async function repairMissingStudentProfile(userId: string, displayName: string | null) {
  const admin = createAdminClient();
  return admin.from("profiles").upsert({
    id: userId,
    role: "student",
    status: "active",
    display_name: displayName,
  });
}
