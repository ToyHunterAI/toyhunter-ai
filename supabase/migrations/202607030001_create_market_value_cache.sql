create table if not exists public.toyhunter_market_values (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  hunt_query text not null,
  toyline text,
  condition_class text not null,
  market_value numeric not null,
  comparable_count integer not null default 0,
  comparable_query text not null,
  source text not null default 'soldcomps',
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists toyhunter_market_values_cache_key_idx
  on public.toyhunter_market_values (cache_key);

create index if not exists toyhunter_market_values_updated_at_idx
  on public.toyhunter_market_values (updated_at);

