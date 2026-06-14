create extension if not exists "pgcrypto";

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  pharmacy_name text not null,
  customer_code text unique,
  governorate text,
  address text,
  contact_name text,
  whatsapp text,
  email text,
  registration_status text default 'pending',
  activation_status text default 'not_activated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  pharmacy_name text not null,
  contact_name text not null,
  whatsapp text not null,
  email text,
  governorate text,
  address text,
  request_type text not null,
  customer_code text,
  status text not null default 'جديد',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_levels (
  id uuid primary key default gen_random_uuid(),
  level_name text not null unique,
  min_points int not null,
  max_points int,
  benefits_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.points_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  rule_type text not null,
  points_value int,
  conditions text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text,
  banner_image text,
  offer_type text not null,
  points_reward int,
  gift_value text,
  start_date date,
  end_date date,
  terms text,
  active boolean not null default true,
  whatsapp_cta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offer_products (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  product_code text not null,
  product_name text,
  created_at timestamptz not null default now(),
  unique (offer_id, product_code)
);

create table if not exists public.product_points_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  product_code text not null,
  product_name text,
  points_per_unit int,
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.point_uploads (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  uploaded_at timestamptz not null default now(),
  total_rows int not null default 0,
  valid_rows int not null default 0,
  duplicate_rows int not null default 0,
  error_rows int not null default 0,
  total_points int not null default 0,
  status text not null default 'draft',
  uploaded_by text
);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete set null,
  customer_code text,
  points_type text not null,
  description text not null,
  points int not null,
  reference_id text not null,
  source text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  created_by text,
  unique (customer_code, reference_id, points_type)
);

create index if not exists idx_points_ledger_pharmacy_id on public.points_ledger (pharmacy_id);
create index if not exists idx_points_ledger_customer_code on public.points_ledger (customer_code);
create index if not exists idx_points_ledger_transaction_date on public.points_ledger (transaction_date desc);

create table if not exists public.point_redemptions (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete set null,
  customer_code text,
  redemption_request text,
  status text not null default 'pending',
  points_used int not null,
  reward_given text,
  notes text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text
);

comment on table public.points_ledger is 'Source of truth for every points movement in the rewards program.';
