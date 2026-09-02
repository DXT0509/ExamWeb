import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-user";
import { getAdminAttemptDetail } from "@/lib/attempts/queries";
import {
  formatAttemptStatus,
  formatDateTime,
  formatEventType,
  formatSubmitReason,
} from "@/lib/attempts/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";

export default async function AdminAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  await requireRole("admin", "/admin/attempts");

  const resolvedParams = await params;
  const attempt = await getAdminAttemptDetail(resolvedParams.attemptId);

  if (!attempt) {
    notFound();
  }

  const totalQuestions = attempt.questionsDetail.length;
  const correctCount = attempt.correctAnswers ?? 0;
  const wrongCount = attempt.wrongAnswers ?? 0;
  const blankCount = attempt.blankAnswers ?? 0;
  const accuracyRate =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Chi tiết lượt thi
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Mã lượt thi: <span className="font-mono text-xs text-[var(--primary)]">{attempt.attemptId}</span>
          </p>
        </div>
        <Button variant="outline" asChild className="border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl">
          <Link href="/admin/attempts">← Quay lại danh sách</Link>
        </Button>
      </div>

      {/* Account locked or Fullscreen violation alert banners */}
      {attempt.submitReason === "account_locked" && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-lg">🔒</span>
            <span>Tài khoản bị khóa trong khi đang làm bài</span>
          </div>
          <p className="mt-1 text-sm">
            Lượt thi này đã bị hệ thống tự động nộp bài và gán lý do{" "}
            <strong>Tài khoản bị khóa</strong> do Admin khóa tài khoản của học sinh.
          </p>
        </div>
      )}

      {attempt.submitReason === "fullscreen_violation" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-lg">⚠️</span>
            <span>Vi phạm quy định toàn màn hình</span>
          </div>
          <p className="mt-1 text-sm">
            Lượt thi bị tự động nộp bài do thoát chế độ toàn màn hình quá thời gian cho phép (5 giây).
          </p>
        </div>
      )}

      {/* Grid Header Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Thông tin lượt thi */}
        <Card className="lg:col-span-2 border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
          <CardHeader className="border-b border-[var(--divider)] pb-4">
            <CardTitle className="text-base font-bold text-[var(--foreground)]">Thông tin lượt thi</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm pt-5">
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Người làm bài</p>
              {attempt.isGuest ? (
                <Badge className="mt-1 bg-[var(--surface-hover)] text-[var(--muted-foreground)] border-[var(--border)]">
                  Khách
                </Badge>
              ) : (
                <div className="mt-1">
                  <p className="font-bold text-[var(--foreground)]">{attempt.studentName}</p>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono">{attempt.studentEmail}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Đề thi / Môn học</p>
              <p className="mt-1 font-bold text-[var(--foreground)]">{attempt.examTitle}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{attempt.subjectName}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Trạng thái & Lý do nộp</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {formatAttemptStatus(attempt.status)}
                </Badge>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {formatSubmitReason(attempt.submitReason)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Điểm số</p>
              <p className="mt-1 text-lg font-extrabold text-[var(--primary)]">
                {attempt.score !== null && attempt.maxScore !== null
                  ? `${attempt.score} / ${attempt.maxScore}`
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Thời gian bắt đầu</p>
              <p className="mt-1 font-medium text-[var(--foreground)]">{formatDateTime(attempt.startedAt)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Thời gian nộp bài</p>
              <p className="mt-1 font-medium text-[var(--foreground)]">{formatDateTime(attempt.submittedAt)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Hạn nộp bài (Deadline)</p>
              <p className="mt-1 font-medium text-[var(--foreground)]">{formatDateTime(attempt.deadlineAt)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Thời lượng quy định</p>
              <p className="mt-1 font-medium text-[var(--foreground)]">{attempt.durationMinutes} phút</p>
            </div>
          </CardContent>
        </Card>

        {/* Thống kê bài làm */}
        <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
          <CardHeader className="border-b border-[var(--divider)] pb-4">
            <CardTitle className="text-base font-bold text-[var(--foreground)]">Thống kê kết quả</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm pt-5">
            <div className="flex items-center justify-between border-b border-[var(--divider)] pb-2">
              <span className="text-[var(--muted-foreground)]">Tổng số câu hỏi</span>
              <span className="font-bold text-[var(--foreground)]">{totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--divider)] pb-2">
              <span className="text-[var(--muted-foreground)]">Số câu đúng</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--divider)] pb-2">
              <span className="text-[var(--muted-foreground)]">Số câu sai</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{wrongCount}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--divider)] pb-2">
              <span className="text-[var(--muted-foreground)]">Số câu bỏ trống</span>
              <span className="font-bold text-[var(--muted-foreground)]">{blankCount}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-[var(--foreground)]">Tỷ lệ chính xác</span>
              <span className="text-lg font-bold text-[var(--primary)]">{accuracyRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Answer Details */}
      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl">
        <CardHeader className="border-b border-[var(--divider)] pb-4">
          <CardTitle className="text-base font-bold text-[var(--foreground)]">Chi tiết câu trả lời ({attempt.questionsDetail.length} câu)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-5">
          {attempt.questionsDetail.map((q, idx) => {
            const isTf = q.questionType === "true_false_group";
            const isShort = q.questionType === "short_answer";

            return (
              <div
                key={q.questionId}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 sm:p-5 text-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="font-semibold text-[var(--foreground)]">
                    Câu {idx + 1}: {q.content}
                    <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                      ({isTf ? "Đúng/Sai" : isShort ? "Trả lời ngắn" : "Trắc nghiệm"} · {q.score}đ)
                    </span>
                  </div>
                  <div>
                    {q.isCorrect ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        Đúng (+{q.score} điểm)
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        Chưa đạt tối đa
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Multiple Choice Breakdown */}
                {!isTf && !isShort && (
                  <div className="space-y-1.5 pl-2">
                    {q.options.map((opt) => {
                      const isSelected = opt.id === q.selectedOptionId;
                      const isCorrect = opt.isCorrect;

                      let optionStyle = "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]";
                      if (isSelected && isCorrect) {
                        optionStyle = "border-emerald-500 bg-emerald-500/15 text-[var(--foreground)] font-semibold";
                      } else if (isSelected && !isCorrect) {
                        optionStyle = "border-rose-500 bg-rose-500/15 text-[var(--foreground)] font-semibold";
                      } else if (isCorrect) {
                        optionStyle = "border-emerald-500/30 bg-emerald-500/10 text-[var(--foreground)]";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${optionStyle}`}
                        >
                          <div>
                            <span className="font-semibold mr-2">
                              {String.fromCharCode(65 + opt.position - 1)}:
                            </span>
                            {opt.content}
                          </div>
                          <div className="flex gap-2">
                            {isSelected && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--surface-hover)] px-2 py-0.5 rounded border border-[var(--border)]">
                                (Học sinh chọn)
                              </span>
                            )}
                            {isCorrect && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                                (Đáp án đúng)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* True / False Group Breakdown */}
                {isTf && (
                  <div className="space-y-2 pl-2">
                    {q.options.map((opt, oIdx) => {
                      const letter = ["a", "b", "c", "d", "e"][oIdx] || `${oIdx + 1}`;
                      const studentVal = q.subAnswers?.[opt.id];
                      const isMatch = studentVal !== undefined && studentVal === opt.isCorrect;

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                            isMatch ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{letter})</span>
                            <span>{opt.content}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>
                              Học sinh chọn:{" "}
                              <strong>{studentVal === true ? "Đúng" : studentVal === false ? "Sai" : "Chưa chọn"}</strong>
                            </span>
                            <span>
                              Đáp án chuẩn: <strong>{opt.isCorrect ? "Đúng" : "Sai"}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer Breakdown */}
                {isShort && (
                  <div className="pl-2 space-y-1 text-xs">
                    <p>
                      Câu trả lời của học sinh: <strong className="font-mono text-sm">{q.textAnswer || "Chưa trả lời"}</strong>
                    </p>
                    <p className="flex items-center gap-2">
                      <span>Đáp án chuẩn: <strong className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{q.correctAnswerRaw || "—"}</strong></span>
                      {q.tolerance !== undefined && q.tolerance !== null && q.tolerance > 0 ? (
                        <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          (Sai số: ± {q.tolerance})
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--muted-foreground)] bg-[var(--surface-hover)] px-2 py-0.5 rounded border border-[var(--border)]">
                          (Sai số: Không cho phép)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                    <span className="font-bold text-blue-600 dark:text-blue-400">💡 Giải thích: </span>
                    <span className="text-[var(--foreground)]">{q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}

          {attempt.questionsDetail.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              Không có chi tiết câu hỏi.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exam Events Audit Log */}
      <Card className="border-[var(--border)] bg-[var(--card)] rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-[var(--divider)] pb-4">
          <CardTitle className="text-base font-bold text-[var(--foreground)]">Nhật ký sự kiện lượt thi ({attempt.eventsLog.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead>
              <tr>
                <Th>Thời điểm Server</Th>
                <Th>Thời điểm Client</Th>
                <Th>Loại sự kiện</Th>
                <Th>Chi tiết / Metadata</Th>
              </tr>
            </thead>
            <tbody>
              {attempt.eventsLog.map((ev) => (
                <tr key={ev.id} className="hover:bg-[var(--surface-hover)]">
                  <Td className="text-xs font-mono text-[var(--muted-foreground)]">{formatDateTime(ev.serverOccurredAt)}</Td>
                  <Td className="text-xs font-mono text-[var(--muted-foreground)]">{formatDateTime(ev.clientOccurredAt)}</Td>
                  <Td>
                    <Badge className="bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]">
                      {formatEventType(ev.eventType)}
                    </Badge>
                  </Td>
                  <Td className="text-xs">
                    {ev.eventType === "fullscreen_exit" && (
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        Thoát toàn màn hình
                        {ev.metadata?.reason ? ` (${String(ev.metadata.reason)})` : ""}
                      </span>
                    )}
                    {ev.eventType === "violation_resolved" && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Đã quay lại toàn màn hình (Khôi phục)
                      </span>
                    )}
                    {ev.eventType === "account_locked" && (
                      <span className="font-semibold text-rose-700 dark:text-rose-400">
                        Tài khoản học sinh bị Admin khóa
                      </span>
                    )}
                    {ev.eventType !== "fullscreen_exit" &&
                      ev.eventType !== "violation_resolved" &&
                      ev.eventType !== "account_locked" && (
                        <pre className="max-w-xs overflow-x-auto font-mono text-[10px] text-[var(--muted-foreground)]">
                          {JSON.stringify(ev.metadata)}
                        </pre>
                      )}
                  </Td>
                </tr>
              ))}
              {attempt.eventsLog.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-4 text-center text-[var(--muted-foreground)]">
                    Không có sự kiện nào được ghi nhận.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
