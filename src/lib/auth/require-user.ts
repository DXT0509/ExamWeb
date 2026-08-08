import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getSafeNextPath } from "@/lib/auth/redirects";

export async function requireUser(nextPath = "/student") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(getSafeNextPath(nextPath, "/student"))}`);
  }

  const profile = await getCurrentProfile();

  if (!profile || profile.status === "locked") {
    redirect("/account-locked");
  }

  return { user, profile };
}

export async function requireRole(role: "student" | "admin", nextPath?: string) {
  const session = await requireUser(nextPath);

  if (session.profile.role !== role) {
    redirect(session.profile.role === "admin" ? "/admin" : "/student");
  }

  return session;
}
