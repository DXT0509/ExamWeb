import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseClientEnv } from "@/lib/env/client";

function testEnv(values: Record<string, string>): NodeJS.ProcessEnv {
  return values as unknown as NodeJS.ProcessEnv;
}

describe("Supabase client environment", () => {
  it("validates when required variables are present", () => {
    expect(
      parseClientEnv(testEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      })),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
  });

  it("fails when Supabase URL is missing", () => {
    expect(() =>
      parseClientEnv(testEnv({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key",
      })),
    ).toThrow();
  });

  it("fails when anon key is missing", () => {
    expect(() =>
      parseClientEnv(testEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      })),
    ).toThrow();
  });

  it("does not include service role access in the browser client module", () => {
    const source = readFileSync("src/lib/supabase/client.ts", "utf8");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
