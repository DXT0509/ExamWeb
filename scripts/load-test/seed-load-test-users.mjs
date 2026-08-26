/**
 * Seed 100 Student test users for k6 load testing
 * Run with: node scripts/load-test/seed-load-test-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Lỗi: Cần SUPABASE_SERVICE_ROLE_KEY trong .env.local để seed user load test.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Bắt đầu khởi tạo 100 tài khoản học sinh phục vụ Load Test...");

  const password = "LoadTestStudent2026!";
  let createdCount = 0;

  for (let i = 1; i <= 100; i++) {
    const email = `loadtest_student_${i}@example.test`;
    const displayName = `Học sinh Load Test ${i}`;

    const { data: userRecord, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (userError && !userError.message.includes("already been registered")) {
      console.error(`Lỗi tạo user ${email}:`, userError.message);
      continue;
    }

    const userId = userRecord?.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        role: "student",
        status: "active",
        display_name: displayName,
      });
    }

    createdCount++;
    if (i % 20 === 0) {
      console.log(`Đã xử lý ${i}/100 tài khoản...`);
    }
  }

  console.log(`Hoàn thành! Đã sẵn sàng ${createdCount} tài khoản học sinh phục vụ kiểm thử tải trọng.`);
}

main().catch(console.error);
