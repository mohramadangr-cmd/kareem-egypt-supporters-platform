-- Apply in Supabase SQL editor after reviewing RLS for the public campaign client.
-- Existing campaign tables and data remain untouched.

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  activity_type text not null,
  points integer not null,
  source_id text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (pharmacy_id, activity_type, source_id)
);

create table if not exists public.app_orders_progress (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null unique references public.pharmacies(id) on delete cascade,
  order_count integer not null default 0,
  qualified_for_grand_draw boolean not null default false,
  last_updated_at timestamptz not null default now()
);

create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  draw_type text not null,
  source text,
  created_at timestamptz not null default now(),
  unique (pharmacy_id, draw_type, source)
);

create unique index if not exists draw_entries_unique_source
  on public.draw_entries (pharmacy_id, draw_type, coalesce(source, ''));

-- Required for the browser client. Keep admin access behind authenticated tooling.
alter table public.points_ledger enable row level security;
alter table public.app_orders_progress enable row level security;
alter table public.draw_entries enable row level security;

drop policy if exists "campaign can read points ledger" on public.points_ledger;
create policy "campaign can read points ledger" on public.points_ledger for select to anon using (true);
drop policy if exists "campaign can add points ledger entries" on public.points_ledger;
create policy "campaign can add points ledger entries" on public.points_ledger for insert to anon with check (true);

drop policy if exists "campaign can read app order progress" on public.app_orders_progress;
create policy "campaign can read app order progress" on public.app_orders_progress for select to anon using (true);
drop policy if exists "campaign can add app order progress" on public.app_orders_progress;
create policy "campaign can add app order progress" on public.app_orders_progress for insert to anon with check (true);
drop policy if exists "campaign can update app order progress" on public.app_orders_progress;
create policy "campaign can update app order progress" on public.app_orders_progress for update to anon using (true) with check (true);

drop policy if exists "campaign can read draw entries" on public.draw_entries;
create policy "campaign can read draw entries" on public.draw_entries for select to anon using (true);
drop policy if exists "campaign can add draw entries" on public.draw_entries;
create policy "campaign can add draw entries" on public.draw_entries for insert to anon with check (true);
