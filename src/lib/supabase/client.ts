"use client";

import { createBrowserClient } from "@supabase/ssr";
import { parseClientEnv } from "@/lib/env/client";
import type { Database } from "@/types/database";

// Browser-only Supabase client. Keep server-only credentials out of this file.
export function createClient() {
  const clientEnv = parseClientEnv(process.env);

  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
