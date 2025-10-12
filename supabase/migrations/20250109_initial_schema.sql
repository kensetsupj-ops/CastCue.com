-- CastCue Initial Schema Migration
-- Version: 0.1
-- Date: 2025-10-09

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Create custom types
create type channel_type as enum ('x','discord');
create type delivery_status as enum ('queued','sent','failed','skipped');

-- 2. Core tables

-- profiles table
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- twitch_accounts table
create table twitch_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broadcaster_id text not null unique,
  login text not null,
  display_name text not null,
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- x_connections table (OAuth tokens encrypted)
create table x_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text[] not null,
  access_token_cipher text not null, -- KMS encrypted
  refresh_token_cipher text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- discord_webhooks table
create table discord_webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  webhook_url text not null,
  created_at timestamptz default now()
);

-- eventsub_subscriptions table
create table eventsub_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  twitch_subscription_id text not null unique,
  type text not null,
  status text not null,
  revocation_reason text,
  created_at timestamptz default now()
);

-- streams table
create table streams (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'twitch',
  stream_id text not null,
  started_at timestamptz not null,
  ended_at_est timestamptz,
  peak int,
  created_at timestamptz default now(),
  unique(user_id, stream_id)
);

-- samples table (viewer count sampling)
create table samples (
  id bigserial primary key,
  stream_id bigint not null references streams(id) on delete cascade,
  taken_at timestamptz not null,
  viewer_count int not null
);

create index samples_stream_id_idx on samples(stream_id);
create index samples_taken_at_idx on samples(taken_at);

-- templates table
create table templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  body text not null,
  variant text check (variant in ('A','B')) default 'A',
  created_at timestamptz default now()
);

-- deliveries table
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stream_id bigint references streams(id) on delete set null,
  channel channel_type not null,
  status delivery_status not null,
  idempotency_key text not null unique,
  post_id text,
  error text,
  latency_ms int,
  created_at timestamptz default now()
);

create index deliveries_user_id_idx on deliveries(user_id);
create index deliveries_stream_id_idx on deliveries(stream_id);
create index deliveries_created_at_idx on deliveries(created_at);

-- links table (short URLs)
create table links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  short_code text not null unique,
  target_url text not null,
  campaign_id uuid,
  created_at timestamptz default now()
);

create index links_short_code_idx on links(short_code);

-- clicks table
create table clicks (
  id bigserial primary key,
  link_id uuid not null references links(id) on delete cascade,
  at timestamptz not null default now(),
  ua text,
  referrer text
);

create index clicks_link_id_idx on clicks(link_id);
create index clicks_at_idx on clicks(at);

-- quotas table
create table quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_limit int not null default 12,
  monthly_used int not null default 0,
  global_monthly_used int not null default 0,
  reset_on date not null
);

-- push_subscriptions table (Web Push)
create table push_subscriptions(
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz default now()
);

-- drafts table (review approval mode)
create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stream_id bigint references streams(id) on delete set null,
  title text not null,
  twitch_url text not null,
  image_url text,
  status text not null default 'pending', -- pending/posted/skipped
  created_at timestamptz default now()
);

create index drafts_user_id_idx on drafts(user_id);
create index drafts_status_idx on drafts(status);

-- 3. Row Level Security (RLS)

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table twitch_accounts enable row level security;
alter table x_connections enable row level security;
alter table discord_webhooks enable row level security;
alter table eventsub_subscriptions enable row level security;
alter table streams enable row level security;
alter table samples enable row level security;
alter table templates enable row level security;
alter table deliveries enable row level security;
alter table links enable row level security;
alter table clicks enable row level security;
alter table quotas enable row level security;
alter table push_subscriptions enable row level security;
alter table drafts enable row level security;

-- Create policies (owner-only access)
create policy p_profiles_owner on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_twitch_accounts_owner on twitch_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_x_connections_owner on x_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_discord_webhooks_owner on discord_webhooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_eventsub_subscriptions_owner on eventsub_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_streams_owner on streams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_samples_owner on samples
  for all using (auth.uid() = (select user_id from streams where id = stream_id));

create policy p_templates_owner on templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_deliveries_owner on deliveries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_links_owner on links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_clicks_owner on clicks
  for all using (auth.uid() = (select user_id from links where id = link_id));

create policy p_quotas_owner on quotas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_push_subscriptions_owner on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_drafts_owner on drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Views

-- Lift calculation view
create or replace view v_lift as
select
  d.id as delivery_id,
  d.user_id,
  s.id as stream_id,
  d.created_at as delivery_at,
  -- Baseline: average viewer count 5 minutes before delivery
  (select avg(viewer_count)::int
   from samples
   where stream_id = s.id
     and taken_at between d.created_at - interval '5 min' and d.created_at
  ) as baseline,
  -- After10: viewer count 10 minutes after delivery
  (select viewer_count
   from samples
   where stream_id = s.id
     and taken_at >= d.created_at + interval '10 min'
   order by taken_at asc
   limit 1
  ) as after10,
  -- Calculate lift
  coalesce(
    (select viewer_count from samples where stream_id = s.id and taken_at >= d.created_at + interval '10 min' order by taken_at asc limit 1),
    0
  ) - coalesce(
    (select avg(viewer_count)::int from samples where stream_id = s.id and taken_at between d.created_at - interval '5 min' and d.created_at),
    0
  ) as lift
from deliveries d
left join streams s on s.id = d.stream_id
where d.status = 'sent';

-- Enable RLS on view
alter view v_lift set (security_invoker = on);

-- 5. Functions

-- Function to initialize user quota
create or replace function init_user_quota(p_user_id uuid)
returns void as $$
begin
  insert into quotas (user_id, reset_on)
  values (
    p_user_id,
    date_trunc('month', now() + interval '1 month')::date
  )
  on conflict (user_id) do nothing;
end;
$$ language plpgsql security definer;

-- Function to consume quota
create or replace function consume_quota(p_user_id uuid, p_amount int default 1)
returns boolean as $$
declare
  v_current_used int;
  v_monthly_limit int;
  v_global_used int;
  v_global_cap int := 400;
begin
  -- Get current quota
  select monthly_used, monthly_limit, global_monthly_used
  into v_current_used, v_monthly_limit, v_global_used
  from quotas
  where user_id = p_user_id;

  -- Check if user has quota
  if v_current_used + p_amount > v_monthly_limit then
    return false;
  end if;

  -- Check global cap
  if v_global_used + p_amount > v_global_cap then
    return false;
  end if;

  -- Consume quota
  update quotas
  set
    monthly_used = monthly_used + p_amount,
    global_monthly_used = global_monthly_used + p_amount
  where user_id = p_user_id;

  return true;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id, display_name)
  values (new.id, new.email);

  perform init_user_quota(new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 6. Comments for documentation
comment on table profiles is 'User profile information';
comment on table twitch_accounts is 'Connected Twitch broadcaster accounts';
comment on table x_connections is 'X (Twitter) OAuth connections with encrypted tokens';
comment on table discord_webhooks is 'Discord webhook URLs for notifications';
comment on table eventsub_subscriptions is 'Twitch EventSub subscription tracking';
comment on table streams is 'Recorded live streams';
comment on table samples is '1-minute interval viewer count samples';
comment on table templates is 'Notification message templates with A/B variants';
comment on table deliveries is 'Notification delivery records';
comment on table links is 'Short URL links for click tracking';
comment on table clicks is 'Click event logs';
comment on table quotas is 'Monthly X post quota management';
comment on table push_subscriptions is 'Web Push notification subscriptions';
comment on table drafts is 'Pending notification drafts for review approval';
