create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;
create policy "own sessions all" on public.chat_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index chat_sessions_user_idx on public.chat_sessions (user_id, created_at);

-- modify chat_messages
alter table public.chat_messages add column session_id uuid references public.chat_sessions(id) on delete cascade;

-- for existing messages, they won't have a session_id. The UI will just ignore them or we can backfill them.
-- To be safe, we'll let existing messages without session_id remain, but new ones will require it.
