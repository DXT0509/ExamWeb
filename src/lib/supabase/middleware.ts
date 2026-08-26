import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { parseClientEnv } from "@/lib/env/client";
import { getHomePathForRole, getSafeNextPath } from "@/lib/auth/redirects";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next();
  const env = parseClientEnv(process.env);

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next();
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedPath = path.startsWith("/student") || path.startsWith("/admin");
  const isAuthPath = path === "/login" || path === "/register";

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", getSafeNextPath(`${path}${request.nextUrl.search}`, "/student"));
    return NextResponse.redirect(url);
  }

  if (user && (isProtectedPath || isAuthPath || path === "/account-locked")) {
    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();

    if (profile?.status === "locked" && path !== "/account-locked") {
      const url = request.nextUrl.clone();
      url.pathname = "/account-locked";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (profile?.status === "active" && path === "/account-locked") {
      const url = request.nextUrl.clone();
      url.pathname = getHomePathForRole(profile.role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (profile?.status === "active" && isAuthPath) {
      const url = request.nextUrl.clone();
      url.pathname = getHomePathForRole(profile.role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (profile?.status === "active" && path.startsWith("/admin") && profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/student";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
