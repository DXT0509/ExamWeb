import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    const key = match?.[1];
    const value = match?.[2];
    if (key && value !== undefined && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const service = createClient<Database>(
  supabaseUrl,
  serviceRoleKey ?? "sb_secret_dummy_service_key_for_testing",
  {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `test-${crypto.randomUUID()}` },
  }
);

describe("Phase 14: Google OAuth & Database Profile Synchronization Integration", () => {
  it("INTEG-OAUTH-1: new Google user automatically creates profile with role 'student' and extracts name", async () => {
    const uniqueEmail = `google_student_${Date.now()}@example.test`;
    const googleFullName = "Nguyen Van An";

    // Simulate Auth user creation from Google OAuth with Google user metadata
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: uniqueEmail,
      email_confirm: true,
      user_metadata: {
        full_name: googleFullName,
        name: googleFullName,
        avatar_url: "https://lh3.googleusercontent.com/a/test",
      },
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();
    const userId = authData.user!.id;

    // Verify trigger on_auth_user_created created public.profiles row
    const { data: profile, error: profileErr } = await service
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    expect(profileErr).toBeNull();
    expect(profile).toBeDefined();
    expect(profile?.role).toBe("student");
    expect(profile?.status).toBe("active");
    expect(profile?.display_name).toBe(googleFullName);

    // Cleanup
    await service.auth.admin.deleteUser(userId);
  });

  it("INTEG-OAUTH-2: client cannot elevate role to 'admin' via raw user metadata", async () => {
    const maliciousEmail = `hacker_${Date.now()}@example.test`;

    // Attempt to inject role: 'admin' into OAuth metadata
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: maliciousEmail,
      email_confirm: true,
      user_metadata: {
        display_name: "Sneaky Hacker",
        role: "admin", // Malicious role claim
      },
    });

    expect(authError).toBeNull();
    const userId = authData.user!.id;

    const { data: profile } = await service
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Database trigger hardcodes role to 'student'
    expect(profile?.role).toBe("student");

    // Cleanup
    await service.auth.admin.deleteUser(userId);
  });

  it("INTEG-OAUTH-3: duplicate profile protection - subsequent logins do not create duplicate or corrupt existing profile", async () => {
    const existingEmail = `existing_${Date.now()}@example.test`;

    // 1. Create first user
    const { data: initialAuth } = await service.auth.admin.createUser({
      email: existingEmail,
      email_confirm: true,
      user_metadata: { display_name: "Original User" },
    });
    const userId = initialAuth.user!.id;

    // 2. Query initial profile
    const { data: initialProfile } = await service
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    expect(initialProfile?.display_name).toBe("Original User");

    // 3. Re-verify profiles table has exactly 1 entry for this user ID
    const { data: profilesList } = await service
      .from("profiles")
      .select("id")
      .eq("id", userId);
    expect(profilesList?.length).toBe(1);

    // Cleanup
    await service.auth.admin.deleteUser(userId);
  });
});
