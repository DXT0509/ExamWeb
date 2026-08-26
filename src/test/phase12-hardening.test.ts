import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateQuestionImageFile } from "@/lib/validations/exam";
import { getSafeNextPath } from "@/lib/auth/redirects";
import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";

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

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
}

describe("Phase 12: Production Hardening Regression Tests", () => {
  it("SEC-002: rejects non-raster and dangerous image formats like SVG, HTML, or empty files", () => {
    // 1. Test SVG rejection (XSS Prevention)
    const svgFile = new File(["<svg><script>alert(1)</script></svg>"], "test.svg", {
      type: "image/svg+xml",
    });
    const svgResult = validateQuestionImageFile(svgFile);
    expect(svgResult.ok).toBe(false);
    if (!svgResult.ok) {
      expect(svgResult.error).toContain("Định dạng không được hỗ trợ");
    }

    // 2. Test HTML rejection
    const htmlFile = new File(["<h1>hello</h1>"], "hack.html", {
      type: "text/html",
    });
    const htmlResult = validateQuestionImageFile(htmlFile);
    expect(htmlResult.ok).toBe(false);
    if (!htmlResult.ok) {
      expect(htmlResult.error).toContain("Định dạng không được hỗ trợ");
    }

    // 3. Test empty file rejection
    const emptyFile = new File([], "empty.png", { type: "image/png" });
    const emptyResult = validateQuestionImageFile(emptyFile);
    expect(emptyResult.ok).toBe(false);
    if (!emptyResult.ok) {
      expect(emptyResult.error).toContain("Vui lòng chọn tệp");
    }

    // 4. Test oversized file rejection (> 5MB)
    const largeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: "image/png" });
    const largeFile = new File([largeBlob], "large.png", { type: "image/png" });
    const largeResult = validateQuestionImageFile(largeFile);
    expect(largeResult.ok).toBe(false);
    if (!largeResult.ok) {
      expect(largeResult.error).toContain("vượt quá 5MB");
    }

    // 5. Test valid PNG acceptance
    const validPng = new File([new Uint8Array(100)], "valid.png", { type: "image/png" });
    const validResult = validateQuestionImageFile(validPng);
    expect(validResult.ok).toBe(true);

    // 6. Test valid JPEG acceptance
    const validJpg = new File([new Uint8Array(100)], "valid.jpg", { type: "image/jpeg" });
    const validJpgResult = validateQuestionImageFile(validJpg);
    expect(validJpgResult.ok).toBe(true);

    // 7. Test valid WebP acceptance
    const validWebp = new File([new Uint8Array(100)], "valid.webp", { type: "image/webp" });
    const validWebpResult = validateQuestionImageFile(validWebp);
    expect(validWebpResult.ok).toBe(true);
  });

  it("AUTH-REDIRECT: getSafeNextPath prevents open redirect attacks", () => {
    expect(getSafeNextPath("https://malicious.com", "/student")).toBe("/student");
    expect(getSafeNextPath("//malicious.com", "/student")).toBe("/student");
    expect(getSafeNextPath("javascript:alert(1)", "/student")).toBe("/student");
    expect(getSafeNextPath("/admin/exams", "/student")).toBe("/admin/exams");
    expect(getSafeNextPath("/student/history?page=2", "/student")).toBe("/student/history?page=2");
  });

  it("SEC-001: updateSession handles NextRequest and enforces authentication redirects", async () => {
    // 1. Mock protected student route
    const studentReq = new NextRequest(new URL("http://localhost:3000/student"));
    const res = await updateSession(studentReq);
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fstudent");

    // 2. Mock protected admin route
    const adminReq = new NextRequest(new URL("http://localhost:3000/admin/exams"));
    const adminRes = await updateSession(adminReq);
    expect(adminRes.status).toBe(307);
    const adminLocation = adminRes.headers.get("location");
    expect(adminLocation).toContain("/login");
    expect(adminLocation).toContain("next=%2Fadmin%2Fexams");

    // 3. Mock public route
    const publicReq = new NextRequest(new URL("http://localhost:3000/exams"));
    const publicRes = await updateSession(publicReq);
    expect(publicRes.status).toBe(200);
  });
});
