import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.LOCAL_ADMIN_EMAIL ?? "admin@example.test";
const password = process.env.LOCAL_ADMIN_PASSWORD ?? "LocalAdmin123!";

if (!supabaseUrl.startsWith("http://127.0.0.1:") && !supabaseUrl.startsWith("http://localhost:")) {
  throw new Error("Script seed Admin chỉ được chạy với Supabase local.");
}

if (!serviceRoleKey) {
  throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY cho môi trường local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
if (listError) throw listError;

let user = listed.users.find((item) => item.email === email);

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Quản trị viên local" },
  });
  if (error) throw error;
  user = data.user;
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  role: "admin",
  status: "active",
  display_name: "Quản trị viên local",
});

if (profileError) throw profileError;

console.log("Đã seed Admin local thành công.");
