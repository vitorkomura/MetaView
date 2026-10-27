-- MetaView — banco de dados no Supabase
-- Cole este arquivo inteiro em SQL Editor > New query e clique em Run.

-- 1) Perfil do usuário (uma linha por conta, criada automaticamente no cadastro)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  settings jsonb not null default '{"faixas":[90,70,50,30]}',
  created_at timestamptz not null default now()
);

-- 2) Hábitos e metas
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'Geral',
  goal text,
  days smallint[] not null default '{0,1,2,3,4,5,6}', -- 0 = domingo ... 6 = sábado
  weight smallint not null default 1 check (weight between 1 and 3),
  start_date date not null default current_date,
  end_date date,
  paused boolean not null default false,
  color text not null default '#1f8a4c',
  created_at timestamptz not null default now()
);

-- 3) Registros diários (um por hábito por dia)
create table public.daily_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  status text not null check (status in ('done', 'part', 'miss', 'na')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (habit_id, log_date)
);
create index daily_logs_user_date_idx on public.daily_logs (user_id, log_date);

-- 4) Agenda
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time not null,
  color text not null default '#7a5c48',
  created_at timestamptz not null default now()
);
create index events_user_date_idx on public.events (user_id, event_date);

-- 5) Segurança: cada pessoa só enxerga e altera os próprios dados (RLS)
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.daily_logs enable row level security;
alter table public.events enable row level security;

create policy "perfil: so o dono" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "habitos: so o dono" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "registros: so o dono" on public.daily_logs
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );

create policy "agenda: so o dono" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6) Cria o perfil automaticamente quando alguém se cadastra
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
