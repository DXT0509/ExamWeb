-- Migration: 20260902180000_phase16_exam_qa_and_subquery_fix.sql
-- Description: Phase 16 - Fix question row duplication in get_admin_attempt_detail for questions with multiple correct options (True/False groups)

create or replace function public.get_admin_attempt_detail(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_exam record;
  v_subject record;
  v_category_name text := null;
  v_student_display_name text := 'Khách';
  v_student_email text := null;
  v_questions jsonb;
  v_events jsonb;
  v_res jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN_ADMIN_REQUIRED';
  end if;

  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt_id;

  if v_attempt.id is null then
    return null;
  end if;

  select * into v_exam
  from public.exams
  where id = v_attempt.exam_id;

  select * into v_subject
  from public.subjects
  where id = v_exam.subject_id;

  if v_exam.category_id is not null then
    select name into v_category_name
    from public.exam_categories
    where id = v_exam.category_id;
  end if;

  if v_attempt.student_id is not null then
    select coalesce(display_name, 'Học sinh') into v_student_display_name
    from public.profiles
    where id = v_attempt.student_id;

    select email into v_student_email
    from auth.users
    where id = v_attempt.student_id;
  end if;

  -- Questions & answers details (using scalar subqueries to avoid duplicating rows on true_false_group questions)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'content', q.content,
        'image_path', q.image_path,
        'explanation', q.explanation,
        'score', q.score,
        'position', q.position,
        'question_type', q.question_type,
        'correct_answer_raw', q.correct_answer_raw,
        'tolerance', q.tolerance,
        'selected_option_id', aa.selected_option_id,
        'text_answer', aa.text_answer,
        'sub_answers', aa.sub_answers,
        'selected_option_content', sel_opt.content,
        'correct_option_id', (
          select o.id from public.question_options o
          where o.question_id = q.id and o.is_correct = true and o.is_active and o.deleted_at is null
          order by o.position asc limit 1
        ),
        'correct_option_content', (
          select o.content from public.question_options o
          where o.question_id = q.id and o.is_correct = true and o.is_active and o.deleted_at is null
          order by o.position asc limit 1
        ),
        'is_correct', case
          when q.question_type = 'short_answer' then public.math_value_equals(aa.text_answer, q.correct_answer_raw, q.tolerance)
          when q.question_type = 'true_false_group' then null
          else coalesce(aa.selected_option_id = (
            select o.id from public.question_options o
            where o.question_id = q.id and o.is_correct = true and o.is_active and o.deleted_at is null
            order by o.position asc limit 1
          ), false)
        end,
        'options', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', opt.id,
                'content', opt.content,
                'position', opt.position,
                'is_correct', opt.is_correct
              ) order by opt.position asc
            ),
            '[]'::jsonb
          )
          from public.question_options opt
          where opt.question_id = q.id and opt.is_active and opt.deleted_at is null
        )
      ) order by s.position asc, q.position asc
    ),
    '[]'::jsonb
  ) into v_questions
  from public.exam_sections s
  join public.questions q on q.section_id = s.id and q.is_active and q.deleted_at is null
  left join public.attempt_answers aa on aa.attempt_id = v_attempt.id and aa.question_id = q.id
  left join public.question_options sel_opt on sel_opt.id = aa.selected_option_id
  where s.exam_id = v_exam.id and s.deleted_at is null;

  -- Event logs
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ev.id,
        'event_type', ev.event_type,
        'client_occurred_at', ev.client_occurred_at,
        'server_occurred_at', ev.server_occurred_at,
        'metadata', ev.metadata,
        'resolved_at', ev.resolved_at
      ) order by ev.server_occurred_at asc
    ),
    '[]'::jsonb
  ) into v_events
  from public.exam_events ev
  where ev.attempt_id = v_attempt.id;

  v_res := jsonb_build_object(
    'attempt_id', v_attempt.id,
    'exam_id', v_exam.id,
    'exam_title', v_exam.title,
    'subject_id', v_subject.id,
    'subject_name', v_subject.name,
    'category_id', v_exam.category_id,
    'category_name', v_category_name,
    'student_id', v_attempt.student_id,
    'student_name', v_student_display_name,
    'student_email', v_student_email,
    'is_guest', (v_attempt.student_id is null),
    'status', v_attempt.status,
    'submit_reason', v_attempt.submit_reason,
    'score', v_attempt.score,
    'max_score', v_attempt.max_score,
    'correct_answers', v_attempt.correct_answers,
    'wrong_answers', v_attempt.wrong_answers,
    'blank_answers', v_attempt.blank_answers,
    'started_at', v_attempt.started_at,
    'deadline_at', v_attempt.deadline_at,
    'submitted_at', v_attempt.submitted_at,
    'finalized_at', v_attempt.finalized_at,
    'duration_minutes', v_exam.duration_minutes,
    'exam_template', v_exam.exam_template,
    'scoring_strategy', v_exam.scoring_strategy,
    'questions_detail', v_questions,
    'events_log', v_events
  );

  return v_res;
end;
$$;
