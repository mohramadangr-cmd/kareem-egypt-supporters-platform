-- Apply in Supabase SQL editor if these campaign tables do not already exist.
-- Configure RLS policies separately. Do not expose contact fields through public select policies.

create extension if not exists pgcrypto;

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  pharmacy_name text not null,
  contact_name text,
  whatsapp text not null unique,
  governorate text,
  customer_code text,
  is_current_customer text,
  online_ordering_interest text,
  preferred_ordering_method text,
  wants_contact boolean,
  favorite_teams text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  match_id text not null,
  team_a text not null,
  team_b text not null,
  score_a integer not null,
  score_b integer not null,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id, match_id)
);

create table if not exists public.wheel_spins (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  spin_date date not null,
  prize text not null,
  created_at timestamptz not null default now(),
  unique (pharmacy_id, spin_date)
);

create table if not exists public.leads_events (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid references public.pharmacies(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
