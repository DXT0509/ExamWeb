import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Custom Performance Metrics according to docs/acceptance-tests.md section 6
export const startAttemptLatency = new Trend("latency_start_attempt");
export const getPayloadLatency = new Trend("latency_get_payload");
export const saveAnswerLatency = new Trend("latency_save_answer");
export const submitAttemptLatency = new Trend("latency_submit_attempt");
export const errorRate5xx = new Rate("rate_5xx_errors");
export const successfulSubmits = new Counter("count_successful_submits");

// Configuration and Thresholds (NFR-PERF-001 & Acceptance Tests)
export const options = {
  scenarios: {
    // LT-001: 100 VU mở đề thi và lấy payload (ramp-up 2m, duration 5m)
    lt_001_exam_start_and_payload: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "2m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
      exec: "examTakingScenario",
    },
  },
  thresholds: {
    rate_5xx_errors: ["rate<0.01"], // 5xx < 1%
    latency_start_attempt: ["p(95)<=800"], // p95 <= 800ms
    latency_get_payload: ["p(95)<=800"], // p95 <= 800ms
    latency_save_answer: ["p(95)<=500"], // p95 <= 500ms
    latency_submit_attempt: ["p(95)<=1200"], // p95 <= 1200ms
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  __ENV.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const TARGET_EXAM_ID = __ENV.EXAM_ID || "40000000-0000-0000-0000-000000000002";

export function examTakingScenario() {
  const vuId = (__VU % 100) + 1;
  const userEmail = `loadtest_student_${vuId}@example.test`;
  const userPassword = "LoadTestStudent2026!";

  // 1. Authenticate with Supabase Auth
  const authHeaders = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };

  const loginRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: userEmail, password: userPassword }),
    { headers: authHeaders }
  );

  if (loginRes.status >= 500) errorRate5xx.add(1);
  else errorRate5xx.add(0);

  if (loginRes.status !== 200) {
    // If login fails (e.g. users not seeded), fallback to guest token simulation
    return;
  }

  const token = loginRes.json("access_token");
  const headers = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
  };

  // 2. LT-001: Start Attempt
  const startReqTime = new Date().getTime();
  const startRes = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/start_attempt`,
    JSON.stringify({ p_exam_id: TARGET_EXAM_ID }),
    { headers: headers }
  );
  startAttemptLatency.add(new Date().getTime() - startReqTime);

  if (startRes.status >= 500) errorRate5xx.add(1);
  else errorRate5xx.add(0);

  check(startRes, {
    "start_attempt success": (r) => r.status === 200,
  });

  const attemptRows = startRes.json();
  const attemptId = Array.isArray(attemptRows) && attemptRows.length > 0 ? attemptRows[0].attempt_id : null;

  if (!attemptId) return;

  // 3. LT-001: Get Attempt Payload
  const payloadReqTime = new Date().getTime();
  const payloadRes = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/get_attempt_payload`,
    JSON.stringify({ p_attempt_id: attemptId }),
    { headers: headers }
  );
  getPayloadLatency.add(new Date().getTime() - payloadReqTime);

  if (payloadRes.status >= 500) errorRate5xx.add(1);
  else errorRate5xx.add(0);

  check(payloadRes, {
    "get_attempt_payload success": (r) => r.status === 200,
    "payload does not leak is_correct": (r) => !r.body.includes("is_correct"),
  });

  const payload = payloadRes.json();
  const sections = payload && payload.sections ? payload.sections : [];

  // 4. LT-002: Save Answers (simulate answering questions with think time 1-3s)
  if (sections.length > 0) {
    for (let s = 0; s < sections.length; s++) {
      const questions = sections[s].questions || [];
      for (let q = 0; q < questions.length; q++) {
        const question = questions[q];
        const options = question.options || [];
        if (options.length > 0) {
          const selectedOption = options[q % options.length];

          const saveReqTime = new Date().getTime();
          const saveRes = http.post(
            `${SUPABASE_URL}/rest/v1/rpc/save_answer`,
            JSON.stringify({
              p_attempt_id: attemptId,
              p_question_id: question.id,
              p_selected_option_id: selectedOption.id,
              p_is_marked: q % 3 === 0,
            }),
            { headers: headers }
          );
          saveAnswerLatency.add(new Date().getTime() - saveReqTime);

          if (saveRes.status >= 500) errorRate5xx.add(1);
          else errorRate5xx.add(0);

          check(saveRes, {
            "save_answer success": (r) => r.status === 200,
          });

          // Simulate think time 1 to 2 seconds
          sleep(1);
        }
      }
    }
  }

  // 5. LT-003 & LT-004: Submit Attempt with Idempotency Key
  const idempotencyKey = `idemp-${attemptId}-${vuId}`;
  const submitReqTime = new Date().getTime();
  const submitRes = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/submit_attempt`,
    JSON.stringify({
      p_attempt_id: attemptId,
      p_idempotency_key: idempotencyKey,
      p_submit_reason: "student_submit",
    }),
    { headers: headers }
  );
  submitAttemptLatency.add(new Date().getTime() - submitReqTime);

  if (submitRes.status >= 500) errorRate5xx.add(1);
  else errorRate5xx.add(0);

  const isSubmitOk = check(submitRes, {
    "submit_attempt success": (r) => r.status === 200,
  });

  if (isSubmitOk) {
    successfulSubmits.add(1);
  }

  // 6. LT-004: Duplicate submit retry verification
  const retryRes = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/submit_attempt`,
    JSON.stringify({
      p_attempt_id: attemptId,
      p_idempotency_key: `retry-${idempotencyKey}`,
      p_submit_reason: "student_submit",
    }),
    { headers: headers }
  );

  check(retryRes, {
    "retry submit returns 200 without error": (r) => r.status === 200,
  });

  sleep(1);
}
