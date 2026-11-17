-- HawkPath AI — Supabase schema. Run once in Supabase → SQL Editor.
-- Each student owns exactly one saved plan; Row Level Security guarantees
-- nobody can read or write another student's record, even with the public anon key.

create table if not exists public.plans (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  profile    jsonb not null,
  scenario   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint profile_size check (pg_column_size(profile) < 65536),
  constraint scenario_size check (pg_column_size(scenario) < 8192)
);

alter table public.plans enable row level security;

drop policy if exists "read own plan"   on public.plans;
drop policy if exists "insert own plan" on public.plans;
drop policy if exists "update own plan" on public.plans;
drop policy if exists "delete own plan" on public.plans;

create policy "read own plan"   on public.plans for select using (auth.uid() = user_id);
create policy "insert own plan" on public.plans for insert with check (auth.uid() = user_id);
create policy "update own plan" on public.plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own plan" on public.plans for delete using (auth.uid() = user_id);
