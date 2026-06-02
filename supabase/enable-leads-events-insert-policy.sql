-- Apply after reviewing your production RLS setup.
-- This permits public campaign clients to log analytics events without granting read access.

alter table public.leads_events enable row level security;

drop policy if exists "anon can insert campaign lead events" on public.leads_events;
create policy "anon can insert campaign lead events"
  on public.leads_events
  for insert
  to anon
  with check (true);
