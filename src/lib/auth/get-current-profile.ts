import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error) {
    return null;
  }

  return data;
}
