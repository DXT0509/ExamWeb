import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { parseServerEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();
  const serverEnv = parseServerEnv(process.env);

  return createServerClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            if (!(error instanceof Error) || !error.message.toLowerCase().includes("cookie")) {
              throw error;
            }
          }
        },
      },
    },
  );
}
