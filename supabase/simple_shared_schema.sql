create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  budget numeric(12, 2) not null default 0,
  start_date date not null,
  end_date date not null,
  owner_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  category text not null,
  description text not null,
  expense_date date not null,
  remark text,
  owner_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.trips enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "Public full access trips" on public.trips;
create policy "Public full access trips"
on public.trips
for all
using (true)
with check (true);

drop policy if exists "Public full access expenses" on public.expenses;
create policy "Public full access expenses"
on public.expenses
for all
using (true)
with check (true);
