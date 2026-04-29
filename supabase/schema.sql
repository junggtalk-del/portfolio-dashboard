create schema if not exists portfolio_dashboard;

grant usage on schema portfolio_dashboard to anon, authenticated;
grant all on all tables in schema portfolio_dashboard to authenticated;
grant all on all sequences in schema portfolio_dashboard to authenticated;
alter default privileges in schema portfolio_dashboard grant all on tables to authenticated;
alter default privileges in schema portfolio_dashboard grant all on sequences to authenticated;

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

alter table portfolio_dashboard.portfolio_quarters enable row level security;
alter table portfolio_dashboard.portfolio_assets enable row level security;

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
