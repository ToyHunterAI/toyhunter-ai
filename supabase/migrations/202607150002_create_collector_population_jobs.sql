create table if not exists public.collector_population_jobs (
  id uuid primary key default gen_random_uuid(),
  toyline text not null,
  source_platform text not null,
  search_query text,
  max_listings integer not null,
  minimum_confidence numeric,
  status text not null default 'pending'
    check (status in (
      'pending',
      'running',
      'completed',
      'completed_with_errors',
      'failed',
      'cancelled'
    )),
  only_new_listings boolean not null default true,
  processed_count integer not null default 0,
  suggestion_count integer not null default 0,
  matched_existing_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_listings > 0),
  check (
    minimum_confidence is null
    or (minimum_confidence >= 0 and minimum_confidence <= 1)
  )
);

create table if not exists public.collector_population_listings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.collector_population_jobs(id) on delete set null,
  source_platform text not null,
  external_listing_id text,
  listing_url text,
  title text,
  processing_status text not null
    check (processing_status in (
      'pending',
      'processed',
      'skipped_duplicate',
      'skipped_low_confidence',
      'failed',
      'cancelled'
    )),
  builder_action text,
  collector_item_id uuid references public.collector_items(id) on delete set null,
  suggestion_ids uuid[] not null default array[]::uuid[],
  confidence numeric,
  skip_reason text,
  error_message text,
  input_payload jsonb not null default '{}'::jsonb,
  builder_result jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    confidence is null
    or (confidence >= 0 and confidence <= 1)
  )
);

create index if not exists collector_population_jobs_status_idx
  on public.collector_population_jobs (status);

create index if not exists collector_population_jobs_created_at_idx
  on public.collector_population_jobs (created_at);

create index if not exists collector_population_listings_job_idx
  on public.collector_population_listings (job_id);

create index if not exists collector_population_listings_status_idx
  on public.collector_population_listings (processing_status);

create index if not exists collector_population_listings_listing_url_idx
  on public.collector_population_listings (listing_url);

create unique index if not exists collector_population_listings_external_unique_idx
  on public.collector_population_listings (
    source_platform,
    external_listing_id
  )
  where external_listing_id is not null;

create unique index if not exists collector_population_listings_url_unique_idx
  on public.collector_population_listings (
    source_platform,
    listing_url
  )
  where listing_url is not null;

drop trigger if exists set_collector_population_jobs_updated_at
  on public.collector_population_jobs;
create trigger set_collector_population_jobs_updated_at
before update on public.collector_population_jobs
for each row execute function public.set_collector_updated_at();
