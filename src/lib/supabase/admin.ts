import { createClient } from "@supabase/supabase-js";
import { parseServerEnv, requireSupabaseServiceRoleKey } from "@/lib/env/server";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const env = parseServerEnv(process.env);
  const serviceRoleKey = requireSupabaseServiceRoleKey(process.env);

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
