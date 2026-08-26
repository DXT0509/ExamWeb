import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export interface CurrentUserProfile {
  id: string;
  email?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  role: "student" | "admin";
  status: "active" | "locked";
  created_at?: string;
  updated_at?: string;
}

export type UserProfile = CurrentUserProfile;

export interface CurrentAuthSession {
  user: User;
  profile: CurrentUserProfile;
}

export async function getCurrentSession(): Promise<CurrentAuthSession | null> {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user || !profile) {
    return null;
  }

  return { user, profile };
}

export { getCurrentUser, getCurrentProfile };
