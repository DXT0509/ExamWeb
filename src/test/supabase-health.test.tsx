import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SupabaseDevelopmentPage from "@/app/dev/supabase/page";

describe("Supabase development health page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders Vietnamese health information without secrets", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-secret-test-value");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret-test-value");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(await SupabaseDevelopmentPage());

    expect(screen.getByRole("heading", { name: "Kiểm tra kết nối Supabase" })).toBeInTheDocument();
    expect(screen.getByText("URL Supabase")).toBeInTheDocument();
    expect(screen.getByText("Khóa công khai")).toBeInTheDocument();
    expect(screen.getByText("Thành công")).toBeInTheDocument();
    expect(screen.queryByText("anon-secret-test-value")).not.toBeInTheDocument();
    expect(screen.queryByText("service-secret-test-value")).not.toBeInTheDocument();
  });
});
