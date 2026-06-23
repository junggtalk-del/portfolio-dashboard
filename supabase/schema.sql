-- ARCHITECTURE NOTE (2026-06):
-- The live app stores ALL portfolio + AI-universe state as JSON documents in
-- portfolio_dashboard.app_state (id = 'main' / 'ai_boom_universe_main' / 'market_data_cache_v1').
-- The normalized tables portfolio_quarters / portfolio_assets below are LEGACY from
-- the old per-user Supabase-auth design and are currently UNUSED by the application.
-- Access is via the service_role key (which bypasses RLS); there is no anon/public
-- data path today. Before ever exposing an anon path, tighten the broad
-- `using (true)` policies (e.g. portfolio_holdings) to service_role-only.

create schema if not exists portfolio_dashboard;

grant usage on schema portfolio_dashboard to anon, authenticated, service_role;
grant all on all tables in schema portfolio_dashboard to authenticated;
grant all on all sequences in schema portfolio_dashboard to authenticated;
grant all on all tables in schema portfolio_dashboard to service_role;
grant all on all sequences in schema portfolio_dashboard to service_role;
alter default privileges in schema portfolio_dashboard grant all on tables to authenticated;
alter default privileges in schema portfolio_dashboard grant all on sequences to authenticated;
alter default privileges in schema portfolio_dashboard grant all on tables to service_role;
alter default privileges in schema portfolio_dashboard grant all on sequences to service_role;

create table if not exists portfolio_dashboard.portfolio_quarters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create table if not exists portfolio_dashboard.portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references portfolio_dashboard.portfolio_quarters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  name text not null,
  manual_value numeric not null default 0,
  invested_percent numeric not null default 100,
  snapshot_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists portfolio_dashboard.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists portfolio_dashboard.fund_nav_history (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  canonical_symbol text not null,
  nav_date date not null,
  nav numeric not null,
  offer_price numeric,
  bid_price numeric,
  change_value numeric,
  change_percent numeric,
  total_net_asset numeric,
  source text not null default 'KAsset',
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_symbol, nav_date)
);

create table if not exists portfolio_dashboard.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  canonical_symbol text not null,
  display_symbol text not null,
  asset_name text not null,
  asset_type text,
  provider_symbol text,
  is_holding boolean not null default false,
  watchlist_only boolean not null default true,
  quantity numeric,
  average_cost numeric,
  cost_value numeric,
  market_value numeric,
  currency text not null default 'THB',
  latest_price numeric,
  latest_price_date date,
  target_weight numeric,
  portfolio_bucket text,
  account_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_symbol)
);

alter table portfolio_dashboard.portfolio_holdings
  add column if not exists provider_symbol text;

alter table portfolio_dashboard.portfolio_holdings
  add column if not exists latest_price numeric;

alter table portfolio_dashboard.portfolio_holdings
  add column if not exists latest_price_date date;

alter table portfolio_dashboard.portfolio_quarters enable row level security;
alter table portfolio_dashboard.portfolio_assets enable row level security;
alter table portfolio_dashboard.app_state enable row level security;
alter table portfolio_dashboard.fund_nav_history enable row level security;
alter table portfolio_dashboard.portfolio_holdings enable row level security;

drop policy if exists "Users can read their quarters" on portfolio_dashboard.portfolio_quarters;
create policy "Users can read their quarters"
on portfolio_dashboard.portfolio_quarters for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their quarters" on portfolio_dashboard.portfolio_quarters;
create policy "Users can insert their quarters"
on portfolio_dashboard.portfolio_quarters for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their quarters" on portfolio_dashboard.portfolio_quarters;
create policy "Users can update their quarters"
on portfolio_dashboard.portfolio_quarters for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their quarters" on portfolio_dashboard.portfolio_quarters;
create policy "Users can delete their quarters"
on portfolio_dashboard.portfolio_quarters for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their assets" on portfolio_dashboard.portfolio_assets;
create policy "Users can read their assets"
on portfolio_dashboard.portfolio_assets for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their assets" on portfolio_dashboard.portfolio_assets;
create policy "Users can insert their assets"
on portfolio_dashboard.portfolio_assets for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their assets" on portfolio_dashboard.portfolio_assets;
create policy "Users can update their assets"
on portfolio_dashboard.portfolio_assets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their assets" on portfolio_dashboard.portfolio_assets;
create policy "Users can delete their assets"
on portfolio_dashboard.portfolio_assets for delete
using (auth.uid() = user_id);

drop policy if exists "Authenticated can read fund nav history" on portfolio_dashboard.fund_nav_history;
create policy "Authenticated can read fund nav history"
on portfolio_dashboard.fund_nav_history for select
using (true);

drop policy if exists "Service role can manage portfolio holdings" on portfolio_dashboard.portfolio_holdings;
create policy "Service role can manage portfolio holdings"
on portfolio_dashboard.portfolio_holdings for all
using (true)
with check (true);
