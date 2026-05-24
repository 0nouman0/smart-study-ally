
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  xp int not null default 0,
  level int not null default 1,
  streak_days int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- tasks (planner / homework)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_at timestamptz,
  duration_minutes int default 45,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "own tasks all" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index tasks_user_due_idx on public.tasks (user_id, due_at);

-- flashcards
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  front text not null,
  back text not null,
  ease real not null default 2.5,
  interval_days int not null default 1,
  due_at timestamptz not null default now(),
  review_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.flashcards enable row level security;
create policy "own cards all" on public.flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index flashcards_user_due_idx on public.flashcards (user_id, due_at);

-- focus sessions
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes int not null,
  subject text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.focus_sessions enable row level security;
create policy "own sessions all" on public.focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "own messages all" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index chat_messages_user_idx on public.chat_messages (user_id, created_at);
