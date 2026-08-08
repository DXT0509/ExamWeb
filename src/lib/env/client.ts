import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Thiếu URL Supabase hợp lệ."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Thiếu khóa công khai Supabase."),
  NEXT_PUBLIC_SITE_URL: z.string().url("Thiếu URL gốc của ứng dụng."),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

function normalizeEnv(env: NodeJS.ProcessEnv) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  };
}

export function parseClientEnv(env: NodeJS.ProcessEnv): ClientEnv {
  return clientEnvSchema.parse(normalizeEnv(env));
}

export function safeParseClientEnv(env: NodeJS.ProcessEnv) {
  return clientEnvSchema.safeParse(normalizeEnv(env));
}
