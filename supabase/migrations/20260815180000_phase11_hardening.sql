-- Phase 11 Hardening Migration
-- 1. Enhance get_attempt_result to return is_guest field
create or replace function public.get_attempt_result(p_attempt_id uuid, p_guest_session_hash text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_attempt public.exam_attempts;
  target_exam public.exams;
  now_ts timestamptz := now();
  questions_detail jsonb := null;
begin
  select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_FOUND';
  end if;

  if not public.verify_attempt_owner(target_attempt, p_guest_session_hash) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ATTEMPT_ACCESS';
  end if;

  -- Auto submit if expired
  if target_attempt.status = 'in_progress' and now_ts >= target_attempt.deadline_at then
    perform public.submit_attempt(p_attempt_id, p_guest_session_hash, null, 'time_expired');
    select * into target_attempt from public.exam_attempts a where a.id = p_attempt_id;
  end if;

  if target_attempt.status = 'in_progress' then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_STILL_IN_PROGRESS';
  end if;

  select * into target_exam from public.exams e where e.id = target_attempt.exam_id;

  -- If show_answers_after_submit or show_solutions_after_submit is enabled, build question details
  if target_exam.show_answers_after_submit or target_exam.show_solutions_after_submit then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'content', q.content,
        'image_path', q.image_path,
        'explanation', case when target_exam.show_solutions_after_submit then q.explanation else null end,
        'score', q.score,
        'position', q.position,
        'selected_option_id', a.selected_option_id,
        'correct_option_id', (
          select id from public.question_options o where o.question_id = q.id and o.is_correct and o.is_active and o.deleted_at is null limit 1
        ),
        'options', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', o.id,
              'content', o.content,
              'position', o.position,
              'is_correct', case when target_exam.show_answers_after_submit then o.is_correct else null end
            ) order by o.position
          ), '[]'::jsonb)
          from public.question_options o
          where o.question_id = q.id and o.is_active and o.deleted_at is null
        )
      ) order by s.position, q.position
    ), '[]'::jsonb) into questions_detail
    from public.exam_sections s
    join public.questions q on q.section_id = s.id and q.is_active and q.deleted_at is null
    left join public.attempt_answers a on a.attempt_id = p_attempt_id and a.question_id = q.id
    where s.exam_id = target_exam.id and s.deleted_at is null;
  end if;

  return jsonb_build_object(
    'attempt_id', target_attempt.id,
    'exam_id', target_exam.id,
    'exam_title', target_exam.title,
    'is_guest', (target_attempt.student_id is null),
    'status', target_attempt.status,
    'submit_reason', target_attempt.submit_reason,
    'started_at', target_attempt.started_at,
    'submitted_at', target_attempt.submitted_at,
    'duration_minutes', target_exam.duration_minutes,
    'show_score_after_submit', target_exam.show_score_after_submit,
    'show_answers_after_submit', target_exam.show_answers_after_submit,
    'show_solutions_after_submit', target_exam.show_solutions_after_submit,
    'score', case when target_exam.show_score_after_submit then target_attempt.score else null end,
    'max_score', case when target_exam.show_score_after_submit then target_attempt.max_score else null end,
    'correct_answers', case when target_exam.show_score_after_submit then target_attempt.correct_answers else null end,
    'wrong_answers', case when target_exam.show_score_after_submit then target_attempt.wrong_answers else null end,
    'blank_answers', case when target_exam.show_score_after_submit then target_attempt.blank_answers else null end,
    'questions_detail', questions_detail
  );
end;
$$;
