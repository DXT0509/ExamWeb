import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath, getHomePathForRole } from "@/lib/auth/redirects";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const next = getSafeNextPath(rawNext, "/student");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", user.id)
          .single();

        if (profile?.status === "locked") {
          return NextResponse.redirect(new URL("/account-locked", url.origin));
        }

        // If next is the default student path and the user is an admin, direct them to /admin
        if ((!rawNext || next === "/student") && profile?.role === "admin") {
          return NextResponse.redirect(new URL(getHomePathForRole("admin"), url.origin));
        }
      }

      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth-error", url.origin));
}
