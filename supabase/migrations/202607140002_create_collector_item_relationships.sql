create table if not exists public.collector_item_relationships (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid not null references public.collector_items(id) on delete cascade,
  target_item_id uuid not null references public.collector_items(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in (
      'includes',
      'belongs_to',
      'required_for_complete',
      'optional_accessory_for',
      'used_by',
      'rider_for',
      'driver_for',
      'weapon_for',
      'transforms_into',
      'variant_of',
      'reissue_of',
      'bootleg_of',
      'packaged_with',
      'instruction_for',
      'box_for',
      'sticker_for',
      'compatible_with',
      'shares_mold_with',
      'part_of_lot'
    )),
  confidence numeric not null default 1,
  source text not null default 'manual',
  review_status text not null default 'approved'
    check (review_status in ('suggested', 'approved', 'rejected', 'merged', 'needs_review', 'conflict')),
  required_for_complete boolean,
  value_impact_level text
    check (
      value_impact_level is null
      or value_impact_level in ('none', 'low', 'medium', 'high', 'critical', 'unknown')
    ),
  quantity integer not null default 1,
  valid_region text,
  valid_year_start integer,
  valid_year_end integer,
  notes text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confidence >= 0 and confidence <= 1),
  check (quantity > 0),
  check (
    valid_year_start is null
    or valid_year_end is null
    or valid_year_start <= valid_year_end
  )
);

create index if not exists collector_item_relationships_source_idx
  on public.collector_item_relationships (source_item_id);

create index if not exists collector_item_relationships_target_idx
  on public.collector_item_relationships (target_item_id);

create index if not exists collector_item_relationships_type_idx
  on public.collector_item_relationships (relationship_type);

create index if not exists collector_item_relationships_review_status_idx
  on public.collector_item_relationships (review_status);

create index if not exists collector_item_relationships_source_type_idx
  on public.collector_item_relationships (source_item_id, relationship_type);

create index if not exists collector_item_relationships_target_type_idx
  on public.collector_item_relationships (target_item_id, relationship_type);

create unique index if not exists collector_item_relationships_identity_unique_idx
  on public.collector_item_relationships (
    source_item_id,
    target_item_id,
    relationship_type,
    coalesce(valid_region, ''),
    coalesce(valid_year_start, 0),
    coalesce(valid_year_end, 0)
  );

drop trigger if exists set_collector_item_relationships_updated_at
  on public.collector_item_relationships;
create trigger set_collector_item_relationships_updated_at
before update on public.collector_item_relationships
for each row execute function public.set_collector_updated_at();

insert into public.collector_item_relationships (
  source_item_id,
  target_item_id,
  relationship_type,
  confidence,
  source,
  review_status,
  required_for_complete,
  value_impact_level,
  quantity,
  notes,
  evidence,
  created_at,
  updated_at
)
select
  parts.parent_item_id,
  parts.part_item_id,
  case
    when parts.required_for_complete then 'required_for_complete'
    else 'optional_accessory_for'
  end,
  1,
  'collector_item_parts_backfill',
  'approved',
  parts.required_for_complete,
  parts.value_impact_level,
  1,
  parts.notes,
  jsonb_build_object(
    'backfilled_from', 'collector_item_parts',
    'collector_item_parts_id', parts.id,
    'frequently_missing', parts.frequently_missing
  ),
  parts.created_at,
  parts.updated_at
from public.collector_item_parts parts
where not exists (
  select 1
  from public.collector_item_relationships existing
  where existing.source_item_id = parts.parent_item_id
    and existing.target_item_id = parts.part_item_id
    and existing.relationship_type = case
      when parts.required_for_complete then 'required_for_complete'
      else 'optional_accessory_for'
    end
    and coalesce(existing.valid_region, '') = ''
    and coalesce(existing.valid_year_start, 0) = 0
    and coalesce(existing.valid_year_end, 0) = 0
);

alter table public.collector_ai_suggestions
  add column if not exists suggested_relationship_type text
    check (
      suggested_relationship_type is null
      or suggested_relationship_type in (
        'includes',
        'belongs_to',
        'required_for_complete',
        'optional_accessory_for',
        'used_by',
        'rider_for',
        'driver_for',
        'weapon_for',
        'transforms_into',
        'variant_of',
        'reissue_of',
        'bootleg_of',
        'packaged_with',
        'instruction_for',
        'box_for',
        'sticker_for',
        'compatible_with',
        'shares_mold_with',
        'part_of_lot'
      )
    ),
  add column if not exists suggested_source_item_id uuid
    references public.collector_items(id) on delete set null,
  add column if not exists suggested_target_item_id uuid
    references public.collector_items(id) on delete set null,
  add column if not exists suggested_entity_payload jsonb not null default '{}'::jsonb,
  add column if not exists suggested_relationship_payload jsonb not null default '{}'::jsonb;

create index if not exists collector_ai_suggestions_relationship_type_idx
  on public.collector_ai_suggestions (suggested_relationship_type);

create index if not exists collector_ai_suggestions_source_item_idx
  on public.collector_ai_suggestions (suggested_source_item_id);

create index if not exists collector_ai_suggestions_target_item_idx
  on public.collector_ai_suggestions (suggested_target_item_id);

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.collector_ai_suggestions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%suggested_alias%'
    and pg_get_constraintdef(oid) like '%suggested_trait_value%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.collector_ai_suggestions drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.collector_ai_suggestions
  add constraint collector_ai_suggestions_has_suggestion_check
  check (
    suggested_alias is not null
    or suggested_collector_item_id is not null
    or suggested_trait_name is not null
    or suggested_trait_value is not null
    or suggested_relationship_type is not null
    or suggested_source_item_id is not null
    or suggested_target_item_id is not null
    or suggested_entity_payload <> '{}'::jsonb
    or suggested_relationship_payload <> '{}'::jsonb
  );
