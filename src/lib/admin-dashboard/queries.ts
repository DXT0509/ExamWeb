import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-user";
import { getAdminAttempts } from "@/lib/attempts/queries";
import type {
  AdminDashboardData,
  AdminDashboardEventItem,
  AdminDashboardStats,
} from "./types";
import type { ExamEventType } from "@/lib/attempts/types";

const defaultStats: AdminDashboardStats = {
  students: {
    total: 0,
    active: 0,
    locked: 0,
  },
  subjects: {
    total: 0,
  },
  exams: {
    total: 0,
    published: 0,
    draft: 0,
    closed: 0,
    archived: 0,
  },
  attempts: {
    total: 0,
    submitted: 0,
    auto_submitted: 0,
    completed: 0,
    in_progress: 0,
    expired: 0,
  },
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireRole("admin", "/admin");

  const supabase = await createClient();

  const [statsResult, attemptsResult, eventsResult] = await Promise.all([
    supabase.rpc("get_admin_dashboard_stats"),
    getAdminAttempts({ page: "1", pageSize: "6" }),
    supabase.rpc("get_admin_dashboard_events", { p_limit: 8 }),
  ]);

  let stats: AdminDashboardStats = defaultStats;
  if (statsResult.error) {
    console.error("Error fetching admin dashboard stats:", statsResult.error);
  } else if (statsResult.data) {
    const raw = statsResult.data as unknown as {
      students?: { total?: number; active?: number; locked?: number };
      subjects?: { total?: number };
      exams?: {
        total?: number;
        published?: number;
        draft?: number;
        closed?: number;
        archived?: number;
      };
      attempts?: {
        total?: number;
        submitted?: number;
        auto_submitted?: number;
        completed?: number;
        in_progress?: number;
        expired?: number;
      };
    };

    stats = {
      students: {
        total: Number(raw.students?.total ?? 0),
        active: Number(raw.students?.active ?? 0),
        locked: Number(raw.students?.locked ?? 0),
      },
      subjects: {
        total: Number(raw.subjects?.total ?? 0),
      },
      exams: {
        total: Number(raw.exams?.total ?? 0),
        published: Number(raw.exams?.published ?? 0),
        draft: Number(raw.exams?.draft ?? 0),
        closed: Number(raw.exams?.closed ?? 0),
        archived: Number(raw.exams?.archived ?? 0),
      },
      attempts: {
        total: Number(raw.attempts?.total ?? 0),
        submitted: Number(raw.attempts?.submitted ?? 0),
        auto_submitted: Number(raw.attempts?.auto_submitted ?? 0),
        completed: Number(raw.attempts?.completed ?? 0),
        in_progress: Number(raw.attempts?.in_progress ?? 0),
        expired: Number(raw.attempts?.expired ?? 0),
      },
    };
  }

  const recentAttempts = attemptsResult.items || [];

  let recentEvents: AdminDashboardEventItem[] = [];
  if (eventsResult.error) {
    console.error("Error fetching admin dashboard events:", eventsResult.error);
  } else if (eventsResult.data) {
    recentEvents = (eventsResult.data || []).map((row) => ({
      eventId: row.event_id,
      attemptId: row.attempt_id,
      eventType: row.event_type as ExamEventType,
      clientOccurredAt: row.client_occurred_at,
      serverOccurredAt: row.server_occurred_at,
      metadata: (row.metadata as Record<string, unknown>) || {},
      resolvedAt: row.resolved_at,
      examId: row.exam_id,
      examTitle: row.exam_title,
      subjectName: row.subject_name,
      studentId: row.student_id,
      studentName: row.student_name || "Khách",
      studentEmail: row.student_email,
      isGuest: row.is_guest,
    }));
  }

  return {
    stats,
    recentAttempts,
    recentEvents,
  };
}
