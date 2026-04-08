create extension if not exists "pgcrypto";

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id),
  unique (user_id, team_id)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  budget numeric(12, 2) not null default 0,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  category text not null,
  description text not null,
  date date not null,
  receipt_url text,
  remark text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_members_team_id_idx on public.team_members (team_id);
create index if not exists trips_team_id_idx on public.trips (team_id);
create index if not exists trips_user_id_idx on public.trips (user_id);
create index if not exists expenses_trip_id_idx on public.expenses (trip_id);
create index if not exists expenses_date_idx on public.expenses (date desc);

create or replace function public.is_team_admin(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where user_id = auth.uid()
      and team_id = target_team_id
      and role = 'admin'
  );
$$;

create or replace function public.belongs_to_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where user_id = auth.uid()
      and team_id = target_team_id
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_team_id uuid;
  requested_team_name text;
begin
  requested_team_name := coalesce(new.raw_user_meta_data ->> 'team_name', 'New Team');

  insert into public.teams (name)
  values (requested_team_name)
  returning id into created_team_id;

  insert into public.team_members (user_id, team_id, role)
  values (new.id, created_team_id, 'admin');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.trips enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "Team members can view own team" on public.teams;
create policy "Team members can view own team"
on public.teams
for select
using (public.belongs_to_team(id));

drop policy if exists "Authenticated users can create teams" on public.teams;
create policy "Authenticated users can create teams"
on public.teams
for insert
with check (auth.uid() is not null);

drop policy if exists "Admins can update own team" on public.teams;
create policy "Admins can update own team"
on public.teams
for update
using (public.is_team_admin(id))
with check (public.is_team_admin(id));

drop policy if exists "Team members can view their team memberships" on public.team_members;
create policy "Team members can view their team memberships"
on public.team_members
for select
using (public.belongs_to_team(team_id));

drop policy if exists "Admins can manage team memberships" on public.team_members;
create policy "Admins can manage team memberships"
on public.team_members
for all
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

drop policy if exists "Members and admins can read allowed trips" on public.trips;
create policy "Members and admins can read allowed trips"
on public.trips
for select
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = trips.team_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or trips.user_id = auth.uid())
  )
);

drop policy if exists "Members and admins can insert allowed trips" on public.trips;
create policy "Members and admins can insert allowed trips"
on public.trips
for insert
with check (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = trips.team_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or trips.user_id = auth.uid())
  )
);

drop policy if exists "Members and admins can update allowed trips" on public.trips;
create policy "Members and admins can update allowed trips"
on public.trips
for update
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = trips.team_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or trips.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = trips.team_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or trips.user_id = auth.uid())
  )
);

drop policy if exists "Members and admins can delete allowed trips" on public.trips;
create policy "Members and admins can delete allowed trips"
on public.trips
for delete
using (
  exists (
    select 1
    from public.team_members tm
    where tm.team_id = trips.team_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or trips.user_id = auth.uid())
  )
);

drop policy if exists "Members and admins can read allowed expenses" on public.expenses;
create policy "Members and admins can read allowed expenses"
on public.expenses
for select
using (
  exists (
    select 1
    from public.trips t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = expenses.trip_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or t.user_id = auth.uid())
  )
);

drop policy if exists "Members and admins can insert allowed expenses" on public.expenses;
create policy "Members and admins can insert allowed expenses"
on public.expenses
for insert
with check (
  exists (
    select 1
    from public.trips t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = expenses.trip_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or t.user_id = auth.uid())
  )
);

drop policy if exists "Members and admins can update allowed expenses" on public.expenses;
create policy "Members and admins can update allowed expenses"
on public.expenses
for update
using (
  exists (
    select 1
    from public.trips t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = expenses.trip_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or t.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trips t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = expenses.trip_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or t.user_id = auth.uid())
  )
);

drop policy if exists "Members and admins can delete allowed expenses" on public.expenses;
create policy "Members and admins can delete allowed expenses"
on public.expenses
for delete
using (
  exists (
    select 1
    from public.trips t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = expenses.trip_id
      and tm.user_id = auth.uid()
      and (tm.role = 'admin' or t.user_id = auth.uid())
  )
);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Users can read allowed receipt files" on storage.objects;
create policy "Users can read allowed receipt files"
on storage.objects
for select
using (
  bucket_id = 'receipts'
  and (
    public.is_team_admin(nullif((storage.foldername(name))[1], '')::uuid)
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);

drop policy if exists "Users can upload allowed receipt files" on storage.objects;
create policy "Users can upload allowed receipt files"
on storage.objects
for insert
with check (
  bucket_id = 'receipts'
  and public.belongs_to_team(nullif((storage.foldername(name))[1], '')::uuid)
  and (
    public.is_team_admin(nullif((storage.foldername(name))[1], '')::uuid)
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);

drop policy if exists "Users can update allowed receipt files" on storage.objects;
create policy "Users can update allowed receipt files"
on storage.objects
for update
using (
  bucket_id = 'receipts'
  and (
    public.is_team_admin(nullif((storage.foldername(name))[1], '')::uuid)
    or (storage.foldername(name))[2] = auth.uid()::text
  )
)
with check (
  bucket_id = 'receipts'
  and public.belongs_to_team(nullif((storage.foldername(name))[1], '')::uuid)
  and (
    public.is_team_admin(nullif((storage.foldername(name))[1], '')::uuid)
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);

drop policy if exists "Users can delete allowed receipt files" on storage.objects;
create policy "Users can delete allowed receipt files"
on storage.objects
for delete
using (
  bucket_id = 'receipts'
  and (
    public.is_team_admin(nullif((storage.foldername(name))[1], '')::uuid)
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);
