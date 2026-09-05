-- Migration: Allow questions to have image only, text only, or both
alter table public.questions drop constraint if exists questions_content_check;

alter table public.questions add constraint questions_content_check
  check (
    char_length(trim(content)) > 0
    or (image_path is not null and char_length(trim(image_path)) > 0)
  );
