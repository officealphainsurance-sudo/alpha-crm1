-- Alpha Insurance CRM: new tables
-- carriers, pipeline, follow_ups, call_logs

-- carriers
create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  carrier_name text not null,
  carrier_code text,
  portal_url text,
  commission_rate numeric(5,2),
  products_offered text[] default '{}',
  am_contact_name text,
  am_contact_phone text,
  am_contact_email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.carriers enable row level security;

create policy "authenticated users can read carriers"
  on public.carriers for select
  to authenticated
  using (true);

create policy "authenticated users can insert carriers"
  on public.carriers for insert
  to authenticated
  with check (true);

create policy "authenticated users can update carriers"
  on public.carriers for update
  to authenticated
  using (true);

-- pipeline
create table if not exists public.pipeline (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid,
  quote_type text not null check (quote_type in ('new', 'renewal', 'cross_sell', 'winback')),
  estimated_premium numeric(10,2),
  current_carrier text,
  desired_coverage text,
  urgency text not null default 'warm' check (urgency in ('hot', 'warm', 'cold')),
  assigned_to uuid references auth.users(id) on delete set null,
  calendly_booked boolean not null default false,
  status text not null default 'open' check (status in ('open', 'quoted', 'won', 'lost')),
  notes text,
  client_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pipeline enable row level security;

create policy "authenticated users can read pipeline"
  on public.pipeline for select
  to authenticated
  using (true);

create policy "authenticated users can insert pipeline"
  on public.pipeline for insert
  to authenticated
  with check (true);

create policy "authenticated users can update pipeline"
  on public.pipeline for update
  to authenticated
  using (true);

-- follow_ups
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  follow_up_type text not null check (follow_up_type in ('renewal', 'reactivation', 'cross_sell', 'payment', 'general')),
  scheduled_date date not null,
  outcome text check (outcome in ('no_answer', 'voicemail', 'spoke', 'texted_no_reply', 'texted_replied', 'emailed', 'reinstated', 'not_interested')),
  priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  client_name text,
  created_at timestamptz not null default now()
);

alter table public.follow_ups enable row level security;

create policy "authenticated users can read follow_ups"
  on public.follow_ups for select
  to authenticated
  using (true);

create policy "authenticated users can insert follow_ups"
  on public.follow_ups for insert
  to authenticated
  with check (true);

create policy "authenticated users can update follow_ups"
  on public.follow_ups for update
  to authenticated
  using (true);

-- call_logs (raw telephony / AI call records)
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  direction text not null check (direction in ('Inbound', 'Outbound')),
  duration_seconds integer,
  recording_url text,
  transcript text,
  ai_summary text,
  created_at timestamptz not null default now()
);

alter table public.call_logs enable row level security;

create policy "authenticated users can read call_logs"
  on public.call_logs for select
  to authenticated
  using (true);

create policy "authenticated users can insert call_logs"
  on public.call_logs for insert
  to authenticated
  with check (true);

-- Ensure contact_logs table has the expected columns
-- (the table already exists in the Alpha Insurance project)
-- This is a no-op if columns are already present.

-- Indexes for common query patterns
create index if not exists idx_follow_ups_client_id on public.follow_ups(client_id);
create index if not exists idx_follow_ups_scheduled_date on public.follow_ups(scheduled_date);
create index if not exists idx_follow_ups_completed on public.follow_ups(completed);
create index if not exists idx_pipeline_status on public.pipeline(status);
create index if not exists idx_pipeline_client_id on public.pipeline(client_id);
create index if not exists idx_contact_logs_client_id on public.contact_logs(client_id);
create index if not exists idx_call_logs_client_id on public.call_logs(client_id);
