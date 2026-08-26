-- Migration 20260809100000_student_history_indexes.sql
-- Phase 9: Optimize student exam history and statistics queries

create index if not exists exam_attempts_student_submitted_idx
  on public.exam_attempts (student_id, submitted_at desc nulls last);

create index if not exists exam_attempts_student_status_idx
  on public.exam_attempts (student_id, status, submitted_at desc nulls last);
