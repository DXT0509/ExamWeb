-- Migration: Exact Match for Short Answer Evaluation
-- Requirement: 100% exact string match between student answer and expected answer

create or replace function public.math_value_equals(p_raw1 text, p_raw2 text, p_tolerance numeric default 0)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  s1 text := trim(coalesce(p_raw1, ''));
  s2 text := trim(coalesce(p_raw2, ''));
begin
  if s1 = '' or s2 = '' then return false; end if;
  return s1 = s2;
end;
$$;
