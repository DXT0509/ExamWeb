-- Migration: 20260830100000_create_support_chat_schema.sql
-- Description: Create support chat schema with strict RLS, triggers, rate limiting, and realtime

create type public.conversation_status as enum ('open', 'closed', 'archived');

-- 1. Conversations Table
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  admin_unread_count integer not null default 0 check (admin_unread_count >= 0),
  student_unread_count integer not null default 0 check (student_unread_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Partial unique index: at most 1 'open' conversation per student
create unique index conversations_student_open_unique on public.conversations (student_id) where status = 'open';
create index conversations_student_id_idx on public.conversations (student_id);
create index conversations_last_message_idx on public.conversations (last_message_at desc);
create index conversations_status_idx on public.conversations (status);

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

-- 2. Messages Table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role public.profile_role not null,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  client_msg_id text null,
  created_at timestamptz not null default now()
);

-- Unique index for client idempotency key
create unique index messages_client_msg_id_unique on public.messages (client_msg_id) where client_msg_id is not null;
create index messages_conversation_created_idx on public.messages (conversation_id, created_at asc);
create index messages_sender_id_idx on public.messages (sender_id);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Grants
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant all on public.conversations to service_role;
grant all on public.messages to service_role;

-- RLS Policies for conversations
create policy "Users can view own conversation or admin all"
on public.conversations for select
to authenticated
using (student_id = auth.uid() or public.is_admin());

create policy "Users can insert own conversation or admin all"
on public.conversations for insert
to authenticated
with check (student_id = auth.uid() or public.is_admin());

create policy "Admins can update conversations"
on public.conversations for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- RLS Policies for messages
create policy "Users can view messages of own conversation or admin all"
on public.messages for select
to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.student_id = auth.uid()
  )
);

create policy "Users can insert messages to own conversation or admin all"
on public.messages for insert
to authenticated
with check (
  (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.student_id = auth.uid()
  )) or (
    public.is_admin() and sender_id = auth.uid()
  )
);

-- 3. Database Functions & RPCs

-- Trigger function to automatically enforce and verify sender_role on messages
create or replace function public.handle_message_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.profile_role;
  v_status public.profile_status;
begin
  select role, status into v_role, v_status
  from public.profiles
  where profiles.id = new.sender_id;

  if v_role is null or v_status != 'active' then
    raise exception 'UNAUTHORIZED_SENDER';
  end if;

  -- Enforce sender_role matches the actual profile role
  new.sender_role := v_role;
  return new;
end;
$$;

create trigger messages_enforce_role_before_insert
before insert on public.messages
for each row execute function public.handle_message_before_insert();

-- RPC: Get or Create Student Conversation
create or replace function public.get_or_create_student_conversation()
returns table (
  id uuid,
  student_id uuid,
  status public.conversation_status,
  last_message_at timestamptz,
  admin_unread_count integer,
  student_unread_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations%rowtype;
  v_status public.profile_status;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.status into v_status from public.profiles p where p.id = v_uid;
  if v_status is null or v_status = 'locked' then
    raise exception 'ACCOUNT_LOCKED';
  end if;

  -- Check for existing open conversation
  select * into v_conv from public.conversations c
  where c.student_id = v_uid and c.status = 'open'
  order by c.last_message_at desc
  limit 1;

  -- If not found, check if there is any conversation (e.g. closed), else create new
  if v_conv.id is null then
    select * into v_conv from public.conversations c
    where c.student_id = v_uid
    order by c.last_message_at desc
    limit 1;

    if v_conv.id is null then
      insert into public.conversations (student_id, status)
      values (v_uid, 'open')
      returning * into v_conv;
    end if;
  end if;

  return query select
    v_conv.id,
    v_conv.student_id,
    v_conv.status,
    v_conv.last_message_at,
    v_conv.admin_unread_count,
    v_conv.student_unread_count,
    v_conv.created_at,
    v_conv.updated_at;
end;
$$;

-- RPC: Send Chat Message with Server-side Rate Limiting & Idempotency
create or replace function public.send_chat_message(
  p_conversation_id uuid,
  p_content text,
  p_client_msg_id text default null
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_role public.profile_role,
  content text,
  client_msg_id text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.profile_role;
  v_pstatus public.profile_status;
  v_conv public.conversations%rowtype;
  v_msg public.messages%rowtype;
  v_trimmed text;
  v_recent_count integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.role, p.status into v_role, v_pstatus
  from public.profiles p
  where p.id = v_uid;

  if v_pstatus is null or v_pstatus = 'locked' then
    raise exception 'ACCOUNT_LOCKED';
  end if;

  v_trimmed := trim(coalesce(p_content, ''));
  if char_length(v_trimmed) < 1 or char_length(v_trimmed) > 2000 then
    raise exception 'INVALID_MESSAGE_LENGTH';
  end if;

  -- Check conversation
  select * into v_conv from public.conversations c where c.id = p_conversation_id;
  if v_conv.id is null then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;

  -- Authorization check
  if v_role = 'student' then
    if v_conv.student_id != v_uid then
      raise exception 'FORBIDDEN';
    end if;

    if v_conv.status = 'archived' then
      raise exception 'CONVERSATION_ARCHIVED';
    end if;

    -- Server-side anti-spam rate limiting: max 15 messages per 60 seconds per student
    select count(*) into v_recent_count
    from public.messages m
    where m.sender_id = v_uid
      and m.created_at >= now() - interval '60 seconds';

    if v_recent_count >= 15 then
      raise exception 'RATE_LIMIT_EXCEEDED';
    end if;

    -- Auto-reopen if closed
    if v_conv.status = 'closed' then
      update public.conversations
      set status = 'open', updated_at = now()
      where public.conversations.id = p_conversation_id;
    end if;
  elsif v_role != 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  -- Idempotency check
  if p_client_msg_id is not null and char_length(trim(p_client_msg_id)) > 0 then
    select * into v_msg from public.messages m
    where m.client_msg_id = trim(p_client_msg_id);

    if v_msg.id is not null then
      return query select
        v_msg.id,
        v_msg.conversation_id,
        v_msg.sender_id,
        v_msg.sender_role,
        v_msg.content,
        v_msg.client_msg_id,
        v_msg.created_at;
      return;
    end if;
  end if;

  -- Insert message
  insert into public.messages (conversation_id, sender_id, sender_role, content, client_msg_id)
  values (p_conversation_id, v_uid, v_role, v_trimmed, nullif(trim(p_client_msg_id), ''))
  returning * into v_msg;

  -- Update conversation unread counters & timestamps
  if v_role = 'student' then
    update public.conversations
    set last_message_at = now(),
        updated_at = now(),
        admin_unread_count = public.conversations.admin_unread_count + 1,
        student_unread_count = 0
    where public.conversations.id = p_conversation_id;
  else
    update public.conversations
    set last_message_at = now(),
        updated_at = now(),
        student_unread_count = public.conversations.student_unread_count + 1,
        admin_unread_count = 0
    where public.conversations.id = p_conversation_id;
  end if;

  return query select
    v_msg.id,
    v_msg.conversation_id,
    v_msg.sender_id,
    v_msg.sender_role,
    v_msg.content,
    v_msg.client_msg_id,
    v_msg.created_at;
end;
$$;

-- RPC: Mark Conversation Read
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.profile_role;
  v_conv public.conversations%rowtype;
begin
  if v_uid is null then
    return false;
  end if;

  select role into v_role from public.profiles where profiles.id = v_uid;
  select * into v_conv from public.conversations where public.conversations.id = p_conversation_id;

  if v_conv.id is null then
    return false;
  end if;

  if v_role = 'admin' then
    update public.conversations
    set admin_unread_count = 0, updated_at = now()
    where public.conversations.id = p_conversation_id;
    return true;
  elsif v_conv.student_id = v_uid then
    update public.conversations
    set student_unread_count = 0, updated_at = now()
    where public.conversations.id = p_conversation_id;
    return true;
  end if;

  return false;
end;
$$;

-- Enable Realtime for conversations and messages
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
