"use client";

import Link from "next/link";
import { BookOpen, Clock, Layers, ShieldAlert, Sparkles, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import {
  formatAttemptStatus,
  formatDateTime,
  formatEventType,
} from "@/lib/attempts/formatters";
import type { AdminDashboardData } from "@/lib/admin-dashboard/types";
import type { ExamEventType } from "@/lib/attempts/types";

interface AdminDashboardUIProps {
  data: AdminDashboardData;
}

function getEventBadgeStyle(eventType: ExamEventType | string): string {
  switch (eventType) {
    case "account_locked":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
    case "fullscreen_exit":
    case "visibility_hidden":
    case "fullscreen_unsupported":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "auto_submit_requested":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "submit_completed":
    case "submit_requested":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "violation_resolved":
    case "fullscreen_return":
    case "visibility_visible":
    case "network_recovered":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "attempt_started":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30";
    default:
      return "bg-[var(--surface-hover)] text-[var(--muted-foreground)] border-[var(--border)]";
  }
}

export function AdminDashboardUI({ data }: AdminDashboardUIProps) {
  const { stats, recentAttempts, recentEvents } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Title, Subtitle & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--divider)] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Bảng điều khiển quản trị hệ thống
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Tổng quan hệ thống
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Theo dõi số liệu thực tế về học sinh, môn học, đề thi và các lượt thi trong hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/exams/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-[var(--primary-hover)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            + Tạo đề mới
          </Link>
        </div>
      </div>

      {/* Row 1: Key Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Students Card */}
        <Card className="border-[var(--border)] bg-[var(--card)] shadow-lg hover:border-purple-500/40 transition-all rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Học sinh
                </span>
              </div>
              <Link
                href="/admin/students"
                className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                Quản lý →
              </Link>
            </div>
            <CardTitle className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
              {stats.students.total.toLocaleString("vi-VN")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {stats.students.active} hoạt động
              </span>
              {stats.students.locked > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  {stats.students.locked} đã khóa
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subjects Card */}
        <Card className="border-[var(--border)] bg-[var(--card)] shadow-lg hover:border-cyan-500/40 transition-all rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Môn học
                </span>
              </div>
              <Link
                href="/admin/subjects"
                className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                Quản lý →
              </Link>
            </div>
            <CardTitle className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
              {stats.subjects.total.toLocaleString("vi-VN")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-[var(--muted-foreground)]">
              Môn học đang kích hoạt trong hệ thống
            </p>
          </CardContent>
        </Card>

        {/* Exams Card */}
        <Card className="border-[var(--border)] bg-[var(--card)] shadow-lg hover:border-blue-500/40 transition-all rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Đề thi
                </span>
              </div>
              <Link
                href="/admin/exams"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Quản lý →
              </Link>
            </div>
            <CardTitle className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
              {stats.exams.total.toLocaleString("vi-VN")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {stats.exams.published} xuất bản
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-[var(--muted-foreground)] bg-[var(--surface-hover)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                {stats.exams.draft} bản nháp
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Attempts Card */}
        <Card className="border-[var(--border)] bg-[var(--card)] shadow-lg hover:border-emerald-500/40 transition-all rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Trophy className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Lượt thi
                </span>
              </div>
              <Link
                href="/admin/attempts"
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Quản lý →
              </Link>
            </div>
            <CardTitle className="text-3xl font-extrabold text-[var(--foreground)] mt-2">
              {stats.attempts.total.toLocaleString("vi-VN")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {stats.attempts.completed} hoàn thành
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {stats.attempts.in_progress} đang làm
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Recent Attempts */}
      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--divider)] pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Lượt thi gần đây
            </CardTitle>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Danh sách các lượt thi mới nhất của học sinh và khách
            </p>
          </div>
          <Link
            href="/admin/attempts"
            className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            Xem tất cả lượt thi ({stats.attempts.total}) →
          </Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {recentAttempts.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Chưa có lượt thi nào được ghi nhận trong hệ thống.
            </div>
          ) : (
            <Table className="min-w-[850px] w-full text-sm">
              <thead>
                <tr>
                  <Th className="whitespace-nowrap min-w-[180px]">Người làm bài</Th>
                  <Th className="whitespace-nowrap min-w-[200px]">Đề thi</Th>
                  <Th className="whitespace-nowrap min-w-[120px]">Trạng thái</Th>
                  <Th className="whitespace-nowrap min-w-[80px] text-center">Điểm</Th>
                  <Th className="whitespace-nowrap min-w-[140px]">Bắt đầu</Th>
                  <Th className="whitespace-nowrap min-w-[140px]">Thời điểm nộp</Th>
                  <Th className="whitespace-nowrap text-right min-w-[100px]">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((attempt) => (
                  <tr key={attempt.attemptId} className="hover:bg-[var(--surface-hover)] group">
                    <Td className="font-medium min-w-[180px]">
                      {attempt.isGuest ? (
                        <Badge className="bg-[var(--surface-hover)] text-[var(--muted-foreground)] border-[var(--border)] whitespace-nowrap shrink-0">
                          Khách
                        </Badge>
                      ) : (
                        <div>
                          <p className="font-semibold text-[var(--foreground)] whitespace-nowrap">
                            {attempt.studentName}
                          </p>
                          {attempt.studentEmail && (
                            <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap font-mono">
                              {attempt.studentEmail}
                            </p>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td className="min-w-[200px]">
                      <span className="font-medium text-[var(--foreground)] line-clamp-1">
                        {attempt.examTitle}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">{attempt.subjectName}</span>
                    </Td>
                    <Td className="whitespace-nowrap min-w-[120px]">
                      {attempt.status === "submitted" && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 whitespace-nowrap shrink-0">
                          {formatAttemptStatus(attempt.status)}
                        </Badge>
                      )}
                      {attempt.status === "auto_submitted" && (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 whitespace-nowrap shrink-0">
                          {formatAttemptStatus(attempt.status)}
                        </Badge>
                      )}
                      {attempt.status === "expired" && (
                        <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 whitespace-nowrap shrink-0">
                          {formatAttemptStatus(attempt.status)}
                        </Badge>
                      )}
                      {attempt.status === "in_progress" && (
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 whitespace-nowrap shrink-0">
                          {formatAttemptStatus(attempt.status)}
                        </Badge>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap min-w-[80px] text-center font-bold text-[var(--foreground)]">
                      {attempt.score !== null && attempt.maxScore !== null
                        ? `${attempt.score} / ${attempt.maxScore}`
                        : "-"}
                    </Td>
                    <Td className="whitespace-nowrap min-w-[140px] text-xs text-[var(--muted-foreground)]">
                      {formatDateTime(attempt.startedAt)}
                    </Td>
                    <Td className="whitespace-nowrap min-w-[140px] text-xs text-[var(--muted-foreground)]">
                      {formatDateTime(attempt.submittedAt)}
                    </Td>
                    <Td className="whitespace-nowrap text-right min-w-[100px]">
                      <Link
                        href={`/admin/attempts/${attempt.attemptId}`}
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] shadow-xs hover:bg-[var(--surface-hover)]"
                      >
                        Xem chi tiết
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Recent Events & Alerts */}
      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
        <CardHeader className="border-b border-[var(--divider)] pb-4">
          <CardTitle className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Hoạt động & cảnh báo gần đây
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Nhật ký sự kiện làm bài và cảnh báo an toàn thi trực tiếp từ phòng thi
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {recentEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Chưa có hoạt động hay cảnh báo nào được ghi nhận.
            </div>
          ) : (
            <Table className="min-w-[850px] w-full text-sm">
              <thead>
                <tr>
                  <Th className="whitespace-nowrap min-w-[180px]">Sự kiện</Th>
                  <Th className="whitespace-nowrap min-w-[180px]">Người liên quan</Th>
                  <Th className="whitespace-nowrap min-w-[200px]">Đề thi</Th>
                  <Th className="whitespace-nowrap min-w-[150px]">Thời gian</Th>
                  <Th className="whitespace-nowrap text-right min-w-[100px]">Lượt thi</Th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((ev) => (
                  <tr key={ev.eventId} className="hover:bg-[var(--surface-hover)] group">
                    <Td className="whitespace-nowrap min-w-[180px]">
                      <Badge
                        className={`whitespace-nowrap shrink-0 border ${getEventBadgeStyle(
                          ev.eventType
                        )}`}
                      >
                        {formatEventType(ev.eventType)}
                      </Badge>
                    </Td>
                    <Td className="min-w-[180px]">
                      {ev.isGuest ? (
                        <span className="text-xs font-medium text-[var(--muted-foreground)] bg-[var(--surface-hover)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                          Khách
                        </span>
                      ) : (
                        <div>
                          <p className="font-semibold text-[var(--foreground)] whitespace-nowrap text-xs">
                            {ev.studentName}
                          </p>
                          {ev.studentEmail && (
                            <p className="text-[11px] text-[var(--muted-foreground)] whitespace-nowrap font-mono">
                              {ev.studentEmail}
                            </p>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td className="min-w-[200px]">
                      <p className="font-medium text-[var(--foreground)] line-clamp-1 text-xs">
                        {ev.examTitle}
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{ev.subjectName}</p>
                    </Td>
                    <Td className="whitespace-nowrap min-w-[150px] text-xs text-[var(--muted-foreground)]">
                      {formatDateTime(ev.serverOccurredAt)}
                    </Td>
                    <Td className="whitespace-nowrap text-right min-w-[100px]">
                      <Link
                        href={`/admin/attempts/${ev.attemptId}`}
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] shadow-xs hover:bg-[var(--surface-hover)]"
                      >
                        Xem lượt thi
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
