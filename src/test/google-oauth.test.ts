import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as callbackHandler } from "@/app/auth/callback/route";
import { getSafeNextPath } from "@/lib/auth/redirects";

// Mock Supabase server client
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
    })),
  })),
}));

describe("Phase 14: Google OAuth Callback & Redirection Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("OAUTH-1: redirects to /auth-error when code parameter is missing", async () => {
    const request = new NextRequest("http://localhost:3000/auth/callback");
    const response = await callbackHandler(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/auth-error");
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("OAUTH-2: redirects to /auth-error when exchangeCodeForSession returns an error", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "Invalid authorization code" },
    });

    const request = new NextRequest("http://localhost:3000/auth/callback?code=bad_code");
    const response = await callbackHandler(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/auth-error");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("bad_code");
  });

  it("OAUTH-3: redirects active student to /student (or next path) on successful OAuth exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "student-uid-123" } },
    });
    mockSingle.mockResolvedValueOnce({
      data: { role: "student", status: "active" },
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid_code&next=%2Fexams%2F123%2Ftake"
    );
    const response = await callbackHandler(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/exams/123/take");
  });

  it("OAUTH-4: redirects active admin to /admin when next is default student path", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "admin-uid-456" } },
    });
    mockSingle.mockResolvedValueOnce({
      data: { role: "admin", status: "active" },
    });

    const request = new NextRequest("http://localhost:3000/auth/callback?code=valid_admin_code");
    const response = await callbackHandler(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/admin");
  });

  it("OAUTH-5: redirects locked user to /account-locked regardless of next path", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "locked-uid-789" } },
    });
    mockSingle.mockResolvedValueOnce({
      data: { role: "student", status: "locked" },
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid_locked_code&next=%2Fexams%2F123"
    );
    const response = await callbackHandler(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/account-locked");
  });

  it("OAUTH-6: prevents open redirect in callback next parameter", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "student-uid-123" } },
    });
    mockSingle.mockResolvedValueOnce({
      data: { role: "student", status: "active" },
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid_code&next=https%3A%2F%2Fmalicious-site.com"
    );
    const response = await callbackHandler(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/student");
  });

  it("OAUTH-7: getSafeNextPath security validation", () => {
    expect(getSafeNextPath("https://evil.com", "/student")).toBe("/student");
    expect(getSafeNextPath("//evil.com", "/student")).toBe("/student");
    expect(getSafeNextPath("/exams/test-1", "/student")).toBe("/exams/test-1");
  });
});
