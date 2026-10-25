create table if not exists public.collector_toylines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  manufacturer text,
  active_year_start integer,
  active_year_end integer,
  primary_region text,
  obscurity_level text not null default 'unknown'
    check (obscurity_level in ('mainstream', 'known', 'niche', 'obscure', 'unknown')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    active_year_start is null
    or active_year_end is null
    or active_year_start <= active_year_end
  )
);

create table if not exists public.collector_items (
  id uuid primary key default gen_random_uuid(),
  toyline_id uuid not null references public.collector_toylines(id) on delete cascade,
  name text not null,
  item_type text not null,
  manufacturer text,
  release_year integer,
  release_region text,
  series_or_wave text,
  parent_item_id uuid references public.collector_items(id) on delete set null,
  popularity_level text not null default 'unknown'
    check (popularity_level in ('very_low', 'low', 'medium', 'high', 'very_high', 'unknown')),
  rarity_level text not null default 'unknown'
    check (rarity_level in ('common', 'uncommon', 'rare', 'very_rare', 'grail', 'unknown')),
  collector_importance text not null default 'unknown'
    check (collector_importance in ('low', 'medium', 'high', 'essential', 'unknown')),
  collector_hidden_gem_level text not null default 'unknown'
    check (collector_hidden_gem_level in ('low', 'medium', 'high', 'very_high', 'unknown')),
  completion_importance text not null default 'unknown'
    check (completion_importance in ('low', 'medium', 'high', 'critical', 'unknown')),
  is_known_valuable_accessory boolean not null default false,
  is_common_item boolean not null default false,
  is_frequently_missing_part boolean not null default false,
  is_bootleg_known boolean not null default false,
  is_japanese_exclusive boolean not null default false,
  typical_condition_classes text[] not null default array[]::text[],
  notes text,
  confidence_level text not null default 'unverified'
    check (confidence_level in ('curated', 'inferred', 'ai_learned', 'unverified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    release_year is null
    or release_year between 1900 and 2100
  )
);

create table if not exists public.collector_aliases (
  id uuid primary key default gen_random_uuid(),
  collector_item_id uuid not null references public.collector_items(id) on delete cascade,
  alias text not null,
  alias_type text not null
    check (alias_type in (
      'search',
      'photo',
      'abbreviation',
      'misspelling',
      'foreign_name',
      'seller_slang',
      'negative'
    )),
  weight integer not null default 1,
  confidence numeric not null default 0.5,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collector_item_id, alias, alias_type),
  check (weight between 0 and 100),
  check (confidence >= 0 and confidence <= 1)
);

create table if not exists public.collector_item_parts (
  id uuid primary key default gen_random_uuid(),
  parent_item_id uuid not null references public.collector_items(id) on delete cascade,
  part_item_id uuid not null references public.collector_items(id) on delete cascade,
  required_for_complete boolean not null default false,
  frequently_missing boolean not null default false,
  value_impact_level text not null default 'unknown'
    check (value_impact_level in ('none', 'low', 'medium', 'high', 'critical', 'unknown')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_item_id, part_item_id),
  check (parent_item_id <> part_item_id)
);

create table if not exists public.collector_item_traits (
  id uuid primary key default gen_random_uuid(),
  collector_item_id uuid not null references public.collector_items(id) on delete cascade,
  trait_name text not null,
  trait_value text not null,
  confidence numeric not null default 1,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collector_item_id, trait_name, trait_value),
  check (confidence >= 0 and confidence <= 1)
);

create table if not exists public.collector_market_traits (
  id uuid primary key default gen_random_uuid(),
  collector_item_id uuid not null references public.collector_items(id) on delete cascade,
  condition_class text not null default 'UNKNOWN',
  currency text not null default 'EUR',
  sell_through_rate numeric,
  active_competition_count integer,
  sold_comps_count integer,
  median_sold_price numeric,
  low_sold_price numeric,
  high_sold_price numeric,
  price_spread numeric,
  volatility_level text not null default 'unknown'
    check (volatility_level in ('low', 'medium', 'high', 'unknown')),
  calculated_at timestamptz not null default now(),
  source text not null default 'calculated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collector_item_id, condition_class, currency),
  check (sell_through_rate is null or sell_through_rate >= 0),
  check (active_competition_count is null or active_competition_count >= 0),
  check (sold_comps_count is null or sold_comps_count >= 0)
);

create table if not exists public.collector_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  collector_item_id uuid references public.collector_items(id) on delete set null,
  suggested_alias text,
  suggested_collector_item_id uuid references public.collector_items(id) on delete set null,
  suggested_trait_name text,
  suggested_trait_value text,
  confidence numeric not null default 0,
  source text not null,
  status text not null default 'suggested'
    check (status in ('suggested', 'approved', 'rejected', 'merged')),
  evidence jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confidence >= 0 and confidence <= 1),
  check (
    suggested_alias is not null
    or suggested_collector_item_id is not null
    or suggested_trait_name is not null
    or suggested_trait_value is not null
  )
);

create table if not exists public.collector_media (
  id uuid primary key default gen_random_uuid(),
  collector_item_id uuid not null references public.collector_items(id) on delete cascade,
  image_url text not null,
  image_type text not null
    check (image_type in (
      'reference',
      'box',
      'accessory',
      'instruction',
      'sticker',
      'catalog',
      'other'
    )),
  confidence numeric not null default 1,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collector_item_id, image_url, image_type),
  check (confidence >= 0 and confidence <= 1)
);

create index if not exists collector_items_toyline_id_idx
  on public.collector_items (toyline_id);

create unique index if not exists collector_items_identity_unique_idx
  on public.collector_items (
    toyline_id,
    lower(name),
    item_type,
    coalesce(release_year, 0),
    coalesce(series_or_wave, '')
  );

create index if not exists collector_items_parent_item_id_idx
  on public.collector_items (parent_item_id);

create index if not exists collector_items_type_idx
  on public.collector_items (item_type);

create index if not exists collector_items_levels_idx
  on public.collector_items (
    rarity_level,
    popularity_level,
    collector_hidden_gem_level
  );

create index if not exists collector_aliases_item_id_idx
  on public.collector_aliases (collector_item_id);

create index if not exists collector_aliases_alias_idx
  on public.collector_aliases (lower(alias));

create index if not exists collector_aliases_type_idx
  on public.collector_aliases (alias_type);

create index if not exists collector_item_parts_parent_idx
  on public.collector_item_parts (parent_item_id);

create index if not exists collector_item_parts_part_idx
  on public.collector_item_parts (part_item_id);

create index if not exists collector_item_traits_item_idx
  on public.collector_item_traits (collector_item_id);

create index if not exists collector_item_traits_name_value_idx
  on public.collector_item_traits (trait_name, trait_value);

create index if not exists collector_market_traits_item_idx
  on public.collector_market_traits (collector_item_id);

create index if not exists collector_market_traits_calculated_at_idx
  on public.collector_market_traits (calculated_at);

create index if not exists collector_ai_suggestions_item_idx
  on public.collector_ai_suggestions (collector_item_id);

create index if not exists collector_ai_suggestions_status_idx
  on public.collector_ai_suggestions (status);

create index if not exists collector_media_item_idx
  on public.collector_media (collector_item_id);

create or replace function public.set_collector_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_collector_toylines_updated_at on public.collector_toylines;
create trigger set_collector_toylines_updated_at
before update on public.collector_toylines
for each row execute function public.set_collector_updated_at();

drop trigger if exists set_collector_items_updated_at on public.collector_items;
create trigger set_collector_items_updated_at
before update on public.collector_items
for each row execute function public.set_collector_updated_at();

drop trigger if exists set_collector_aliases_updated_at on public.collector_aliases;
create trigger set_collector_aliases_updated_at
before update on public.collector_aliases
for each row execute function public.set_collector_updated_at();

drop trigger if exists set_collector_item_parts_updated_at on public.collector_item_parts;
create trigger set_collector_item_parts_updated_at
before update on public.collector_item_parts
for each row execute function public.set_collector_updated_at();

drop trigger if exists set_collector_item_traits_updated_at on public.collector_item_traits;
create trigger set_collector_item_traits_updated_at
before update on public.collector_item_traits
for each row execute function public.set_collector_updated_at();

drop trigger if exists set_collector_market_traits_updated_at on public.collector_market_traits;
create trigger set_collector_market_traits_updated_at
before update on public.collector_market_traits
for each row execute function public.set_collector_updated_at();

drop trigger if exists set_collector_ai_suggestions_updated_at on public.collector_ai_suggestions;
create trigger set_collector_ai_suggestions_updated_at
before update on public.collector_ai_suggestions
for each row execute function public.set_collector_updated_at();

drop trigger if exists set_collector_media_updated_at on public.collector_media;
create trigger set_collector_media_updated_at
before update on public.collector_media
for each row execute function public.set_collector_updated_at();
