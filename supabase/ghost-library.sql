-- Run this in the Supabase SQL Editor for GHOST Music cloud library sync.
create table if not exists public.ghost_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  library jsonb not null default '{"liked":[],"playlists":[],"history":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ghost_libraries enable row level security;
drop policy if exists "Users can read their own GHOST library" on public.ghost_libraries;
create policy "Users can read their own GHOST library" on public.ghost_libraries for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own GHOST library" on public.ghost_libraries;
create policy "Users can insert their own GHOST library" on public.ghost_libraries for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own GHOST library" on public.ghost_libraries;
create policy "Users can update their own GHOST library" on public.ghost_libraries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
