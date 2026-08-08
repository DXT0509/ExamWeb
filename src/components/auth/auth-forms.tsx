"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/actions/auth";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction, updateProfileAction } from "@/lib/actions/auth";

function Message({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm text-red-600" role="alert">{state.error}</p>;
  if (state.success) return <p className="text-sm text-green-700" role="status">{state.success}</p>;
  return null;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {});
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">Tên hiển thị<Input name="displayName" autoComplete="name" required /></label>
      <label className="grid gap-1 text-sm">Địa chỉ email<Input name="email" type="email" autoComplete="email" required /></label>
      <label className="grid gap-1 text-sm">Mật khẩu<Input name="password" type="password" autoComplete="new-password" required /></label>
      <label className="grid gap-1 text-sm">Xác nhận mật khẩu<Input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Đang tạo tài khoản..." : "Đăng ký"}</Button>
      <p className="text-sm">Bạn đã có tài khoản? <Link className="text-[var(--primary)]" href="/login">Đăng nhập</Link></p>
    </form>
  );
}

export function LoginForm({ next, resetSuccess }: { next?: string; resetSuccess?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, resetSuccess ? { success: "Mật khẩu đã được cập nhật." } : {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="next" value={next ?? "/student"} />
      <label className="grid gap-1 text-sm">Địa chỉ email<Input name="email" type="email" autoComplete="email" required /></label>
      <label className="grid gap-1 text-sm">Mật khẩu<Input name="password" type="password" autoComplete="current-password" required /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Đang đăng nhập..." : "Đăng nhập"}</Button>
      <div className="flex justify-between gap-3 text-sm">
        <Link className="text-[var(--primary)]" href="/forgot-password">Quên mật khẩu?</Link>
        <Link className="text-[var(--primary)]" href="/register">Tạo tài khoản</Link>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">Địa chỉ email<Input name="email" type="email" autoComplete="email" required /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu"}</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">Mật khẩu mới<Input name="password" type="password" autoComplete="new-password" required /></label>
      <label className="grid gap-1 text-sm">Xác nhận mật khẩu mới<Input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</Button>
    </form>
  );
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm">Tên hiển thị<Input name="displayName" defaultValue={displayName} required /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Đang lưu..." : "Lưu thay đổi"}</Button>
    </form>
  );
}
