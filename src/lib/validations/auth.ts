import { z } from "zod";

const displayName = z
  .string()
  .trim()
  .min(2, "Tên hiển thị phải có ít nhất 2 ký tự.")
  .max(100, "Tên hiển thị không được vượt quá 100 ký tự.");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Vui lòng nhập địa chỉ email hợp lệ.");

const password = z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự.");

export const registerSchema = z
  .object({
    displayName,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });

export const profileSchema = z.object({ displayName });
