import { z } from "zod";
import { parseClientEnv } from "@/lib/env/client";

const serviceRoleSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Thiếu service role key của Supabase."),
});

export function parseServerEnv(env: NodeJS.ProcessEnv) {
  return {
    ...parseClientEnv(env),
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function requireSupabaseServiceRoleKey(env: NodeJS.ProcessEnv = process.env) {
  return serviceRoleSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  }).SUPABASE_SERVICE_ROLE_KEY;
}
