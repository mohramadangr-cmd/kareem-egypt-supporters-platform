-- Kareem Pharma Rewards Program production schema
-- Apply after reviewing in Supabase. This migration preserves existing data
-- and extends the current campaign schema for the permanent rewards platform.

create extension if not exists pgcrypto;

create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  pharmacy_name text,
  contact_name text,
  whatsapp text,
  email text,
  governorate text,
  address text,
  request_type text,
  customer_code text,
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text,
  banner_url text,
  offer_type text,
  reward_text text,
  points_reward integer not null default 0,
  gift_value numeric,
  start_date date,
  end_date date,
  terms text,
  is_active boolean not null default true,
  whatsapp_message text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_levels (
  id uuid primary key default gen_random_uuid(),
  level_name text not null,
  min_points integer not null,
  max_points integer,
  benefits text,
  sort_order integer not null default 0
);

create table if not exists public.point_uploads (
  id uuid primary key default gen_random_uuid(),
  filename text,
  uploaded_at timestamptz not null default now(),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  error_rows integer not null default 0,
  total_points integer not null default 0,
  status text
);

create table if not exists public.point_redemptions (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete set null,
  customer_code text,
  points_used integer not null default 0,
  reward_type text,
  reward_description text,
  status text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

alter table public.points_ledger add column if not exists customer_code text;
alter table public.points_ledger add column if not exists points_type text;
alter table public.points_ledger add column if not exists description text;
alter table public.points_ledger add column if not exists reference_id text;
alter table public.points_ledger add column if not exists source text;
alter table public.points_ledger add column if not exists transaction_date date;
alter table public.points_ledger add column if not exists created_by text;

update public.points_ledger
set points_type = coalesce(points_type, activity_type)
where points_type is null;

update public.points_ledger
set description = coalesce(description, notes)
where description is null;

update public.points_ledger
set reference_id = coalesce(reference_id, source_id)
where reference_id is null;

update public.points_ledger
set transaction_date = coalesce(transaction_date, created_at::date)
where transaction_date is null;

create index if not exists idx_registration_requests_status on public.registration_requests(status, created_at desc);
create index if not exists idx_registration_requests_whatsapp on public.registration_requests(whatsapp);
create index if not exists idx_offers_active_dates on public.offers(is_active, start_date, end_date, sort_order);
create index if not exists idx_loyalty_levels_sort on public.loyalty_levels(sort_order);
create index if not exists idx_points_ledger_lookup on public.points_ledger(pharmacy_id, customer_code, transaction_date desc);
create index if not exists idx_point_redemptions_lookup on public.point_redemptions(pharmacy_id, customer_code, created_at desc);

insert into public.loyalty_levels (level_name, min_points, max_points, benefits, sort_order)
select * from (
  values
    ('برونزي', 0, 999, null, 1),
    ('فضي', 1000, 2999, null, 2),
    ('ذهبي', 3000, 6999, null, 3),
    ('بلاتيني', 7000, null, null, 4)
) as defaults(level_name, min_points, max_points, benefits, sort_order)
where not exists (select 1 from public.loyalty_levels);

alter table public.registration_requests enable row level security;
alter table public.offers enable row level security;
alter table public.loyalty_levels enable row level security;
alter table public.points_ledger enable row level security;
alter table public.point_uploads enable row level security;
alter table public.point_redemptions enable row level security;

drop policy if exists "public can insert registration requests" on public.registration_requests;
create policy "public can insert registration requests"
  on public.registration_requests
  for insert
  to anon
  with check (true);

drop policy if exists "public can read active offers" on public.offers;
create policy "public can read active offers"
  on public.offers
  for select
  to anon
  using (true);

drop policy if exists "public can manage offers" on public.offers;
create policy "public can manage offers"
  on public.offers
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "public can read loyalty levels" on public.loyalty_levels;
create policy "public can read loyalty levels"
  on public.loyalty_levels
  for select
  to anon
  using (true);

drop policy if exists "public can manage loyalty levels" on public.loyalty_levels;
create policy "public can manage loyalty levels"
  on public.loyalty_levels
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "public can read points ledger" on public.points_ledger;
create policy "public can read points ledger"
  on public.points_ledger
  for select
  to anon
  using (true);

drop policy if exists "public can insert points ledger" on public.points_ledger;
create policy "public can insert points ledger"
  on public.points_ledger
  for insert
  to anon
  with check (true);

drop policy if exists "public can update points ledger" on public.points_ledger;
create policy "public can update points ledger"
  on public.points_ledger
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "public can read point uploads" on public.point_uploads;
create policy "public can read point uploads"
  on public.point_uploads
  for select
  to anon
  using (true);

drop policy if exists "public can manage point uploads" on public.point_uploads;
create policy "public can manage point uploads"
  on public.point_uploads
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "public can read point redemptions" on public.point_redemptions;
create policy "public can read point redemptions"
  on public.point_redemptions
  for select
  to anon
  using (true);

drop policy if exists "public can manage point redemptions" on public.point_redemptions;
create policy "public can manage point redemptions"
  on public.point_redemptions
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "public can read registration requests" on public.registration_requests;
create policy "public can read registration requests"
  on public.registration_requests
  for select
  to anon
  using (true);

drop policy if exists "public can update registration requests" on public.registration_requests;
create policy "public can update registration requests"
  on public.registration_requests
  for update
  to anon
  using (true)
  with check (true);
