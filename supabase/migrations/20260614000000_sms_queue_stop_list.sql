-- Alpha Insurance: sms_queue and stop_list tables

-- sms_queue: stores campaign batches for async sending
create table if not exists public.sms_queue (
  id uuid primary key default gen_random_uuid(),
  segment text not null,
  message_template text not null,
  client_count integer not null default 0,
  excluded_count integer not null default 0,
  queued_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  queued_by text
);

alter table public.sms_queue enable row level security;

create policy "authenticated users can read sms_queue"
  on public.sms_queue for select
  to authenticated
  using (true);

create policy "authenticated users can insert sms_queue"
  on public.sms_queue for insert
  to authenticated
  with check (true);

create policy "authenticated users can update sms_queue"
  on public.sms_queue for update
  to authenticated
  using (true);

-- stop_list: phones opted out of all SMS communication
create table if not exists public.stop_list (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  reason text not null default 'Opted Out',
  added_by text,
  created_at timestamptz not null default now()
);

alter table public.stop_list enable row level security;

create policy "authenticated users can read stop_list"
  on public.stop_list for select
  to authenticated
  using (true);

create policy "authenticated users can insert stop_list"
  on public.stop_list for insert
  to authenticated
  with check (true);

create policy "authenticated users can update stop_list"
  on public.stop_list for update
  to authenticated
  using (true);

create policy "authenticated users can delete stop_list"
  on public.stop_list for delete
  to authenticated
  using (true);

-- index for fast phone lookups during campaign exclusion filtering
create index if not exists idx_stop_list_phone on public.stop_list (phone);
