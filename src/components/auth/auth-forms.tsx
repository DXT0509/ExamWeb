"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ActionState } from "@/lib/actions/auth";
import { forgotPasswordAction, loginAction, resetPasswordAction, updateProfileAction } from "@/lib/actions/auth";

function Message({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-xs text-rose-600 dark:text-rose-400 font-medium" role="alert">{state.error}</p>;
  if (state.success) return <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium" role="status">{state.success}</p>;
  return null;
}

export function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27a7.15 7.15 0 0 1 0-4.54V6.58H1.25a11.97 11.97 0 0 0 0 10.84l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ next, label = "Tiếp tục với Google" }: { next?: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const supabase = createClient();
      const origin = window.location.origin;
      const targetNext = next ?? "/student";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(targetNext)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Không thể kết nối với Google lúc này. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Google OAuth error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Đã xảy ra lỗi khi khởi tạo đăng nhập Google.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] font-semibold shadow-md hover:shadow-lg transition-all text-sm cursor-pointer"
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        <span>{loading ? "Đang chuyển hướng tới Google..." : label}</span>
      </Button>
      {errorMessage && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium text-center" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export function LoginForm({ next, resetSuccess }: { next?: string; resetSuccess?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, resetSuccess ? { success: "Mật khẩu đã được cập nhật." } : {});

  return (
    <div className="space-y-4">
      {/* Primary: Google OAuth */}
      <GoogleSignInButton next={next} label="Tiếp tục với Google" />

      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-[var(--border)] w-full" />
        <span className="bg-[var(--card)] px-3 text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium shrink-0">
          hoặc đăng nhập bằng mật khẩu
        </span>
        <div className="border-t border-[var(--border)] w-full" />
      </div>

      <form action={action} className="grid gap-3.5">
        <input type="hidden" name="next" value={next ?? "/student"} />
        <label className="grid gap-1 text-xs font-semibold text-[var(--foreground)]">
          Địa chỉ email
          <Input name="email" type="email" autoComplete="email" required placeholder="name@example.com" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--foreground)]">
          Mật khẩu
          <Input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        </label>
        <Message state={state} />
        <Button
          type="submit"
          disabled={pending}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20 text-xs h-10"
        >
          {pending ? "Đang đăng nhập..." : "Đăng nhập với mật khẩu"}
        </Button>
        <div className="flex justify-end text-xs pt-1 text-[var(--muted-foreground)]">
          <Link className="text-[var(--primary)] hover:underline" href="/forgot-password">
            Quên mật khẩu?
          </Link>
        </div>
      </form>
    </div>
  );
}

export function RegisterForm() {
  return (
    <div className="space-y-4">
      <GoogleSignInButton label="Đăng ký với Google" />
      <p className="text-xs text-[var(--muted-foreground)] text-center">
        Tài khoản học sinh được tạo tự động và an toàn thông qua Google.
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});
  return (
    <form action={action} className="grid gap-3.5">
      <label className="grid gap-1 text-xs font-semibold text-[var(--foreground)]">Địa chỉ email<Input name="email" type="email" autoComplete="email" required placeholder="name@example.com" /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">{pending ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu"}</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="grid gap-3.5">
      <label className="grid gap-1 text-xs font-semibold text-[var(--foreground)]">Mật khẩu mới<Input name="password" type="password" autoComplete="new-password" required placeholder="••••••••" /></label>
      <label className="grid gap-1 text-xs font-semibold text-[var(--foreground)]">Xác nhận mật khẩu mới<Input name="confirmPassword" type="password" autoComplete="new-password" required placeholder="••••••••" /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">{pending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</Button>
    </form>
  );
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-3.5">
      <label className="grid gap-1 text-xs font-semibold text-[var(--foreground)]">Tên hiển thị<Input name="displayName" defaultValue={displayName} required placeholder="Họ và tên" /></label>
      <Message state={state} />
      <Button type="submit" disabled={pending} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-blue-600/20">{pending ? "Đang lưu..." : "Lưu thay đổi"}</Button>
    </form>
  );
}
