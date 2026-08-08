insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@example.test', crypt('LocalAdmin123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Quản trị viên local"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'student1@example.test', crypt('LocalStudent123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Học viên một"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'locked@example.test', crypt('LocalStudent123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Học viên bị khóa"}', now(), now(), '', '', '', '')
on conflict (id) do update set email = excluded.email, updated_at = now();

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin@example.test', '{"sub":"10000000-0000-0000-0000-000000000001","email":"admin@example.test"}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'student1@example.test', '{"sub":"10000000-0000-0000-0000-000000000002","email":"student1@example.test"}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'locked@example.test', '{"sub":"10000000-0000-0000-0000-000000000003","email":"locked@example.test"}', 'email', now(), now(), now())
on conflict (provider, provider_id) do nothing;

insert into public.profiles (id, role, status, display_name) values
  ('10000000-0000-0000-0000-000000000001', 'admin', 'active', 'Quản trị viên local'),
  ('10000000-0000-0000-0000-000000000002', 'student', 'active', 'Học viên một'),
  ('10000000-0000-0000-0000-000000000003', 'student', 'locked', 'Học viên bị khóa')
on conflict (id) do update set role = excluded.role, status = excluded.status, display_name = excluded.display_name;

insert into public.subjects (id, name, slug, description, created_by, updated_by) values
  ('20000000-0000-0000-0000-000000000001', 'Toán học', 'toan-hoc', 'Các đề luyện tư duy định lượng và tính toán.', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Ngữ văn', 'ngu-van', 'Các đề đọc hiểu và lập luận ngôn ngữ.', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, description = excluded.description;

insert into public.exam_categories (id, name, slug, description, created_by, updated_by) values
  ('30000000-0000-0000-0000-000000000001', 'HSA', 'hsa', 'Đề luyện đánh giá năng lực theo cấu trúc tự tạo.', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'TSA', 'tsa', 'Đề luyện tư duy tổng hợp theo cấu trúc tự tạo.', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', 'THPT Quốc gia', 'thpt-quoc-gia', 'Đề luyện tốt nghiệp trung học phổ thông.', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, description = excluded.description;

insert into public.exams (
  id, subject_id, category_id, title, slug, description, status, access_type, allow_guest_attempt,
  fullscreen_required, duration_minutes, total_score, published_at, created_by, updated_by
) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Đề nháp tư duy định lượng', 'de-nhap-tu-duy-dinh-luong', 'Đề nháp dùng để kiểm tra thao tác soạn nội dung.', 'draft', 'private', false, true, 60, 0, null, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Đề công khai nền tảng số', 'de-cong-khai-nen-tang-so', 'Đề mẫu công khai cho Guest và Student.', 'draft', 'public', true, true, 45, 0, null, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Đề dành cho học viên đọc hiểu', 'de-danh-cho-hoc-vien-doc-hieu', 'Đề mẫu chỉ dành cho tài khoản Student active.', 'draft', 'students_only', false, false, 50, 0, null, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Đề riêng của quản trị viên', 'de-rieng-cua-quan-tri-vien', 'Đề riêng để kiểm tra RLS private.', 'draft', 'private', false, true, 40, 0, null, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

do $$
declare
  exam_ids uuid[] := array['40000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000003'::uuid];
  exam_id uuid;
  section_id uuid;
  question_id uuid;
  question_no integer;
  section_no integer;
begin
  foreach exam_id in array exam_ids loop
    for section_no in 1..2 loop
      section_id := gen_random_uuid();
      insert into public.exam_sections (id, exam_id, title, description, position)
      values (section_id, exam_id, 'Phần ' || section_no, 'Nội dung luyện tập tự tạo.', section_no)
      on conflict do nothing;

      for question_no in 1..5 loop
        question_id := gen_random_uuid();
        insert into public.questions (id, section_id, content, explanation, score, position)
        values (
          question_id,
          section_id,
          'Câu ' || (((section_no - 1) * 5) + question_no) || ': Chọn phương án phù hợp nhất cho tình huống học tập mẫu.',
          'Lời giải dựa trên dữ kiện đã nêu trong câu hỏi mẫu.',
          1,
          question_no
        );
        insert into public.question_options (question_id, content, position, is_correct) values
          (question_id, 'Phương án A có dữ kiện chưa đầy đủ.', 1, false),
          (question_id, 'Phương án B phù hợp với yêu cầu của câu hỏi.', 2, true),
          (question_id, 'Phương án C nhầm lẫn giữa giả thiết và kết luận.', 3, false),
          (question_id, 'Phương án D bỏ qua điều kiện quan trọng.', 4, false);
      end loop;
    end loop;
  end loop;
end $$;

update public.exams
set status = 'published',
    published_at = now(),
    total_score = case when id in ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003') then 10 else 0 end,
    updated_by = '10000000-0000-0000-0000-000000000001'
where id in (
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004'
);
