create table if not exists public.collector_ai_learning_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern_key text not null unique,
  pattern_type text not null default 'field_correction',
  field_name text not null,
  scope jsonb not null default '{}'::jsonb,
  rule jsonb not null,
  evidence_event_ids uuid[] not null default array[]::uuid[],
  evidence_count integer not null default 0 check (evidence_count >= 0),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'candidate'
    check (status in ('candidate', 'approved', 'rejected', 'superseded')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collector_ai_learning_patterns_status_idx
  on public.collector_ai_learning_patterns (status, evidence_count desc);

create index if not exists collector_ai_learning_patterns_field_idx
  on public.collector_ai_learning_patterns (field_name);

drop trigger if exists collector_ai_learning_patterns_set_updated_at
  on public.collector_ai_learning_patterns;

create trigger collector_ai_learning_patterns_set_updated_at
before update on public.collector_ai_learning_patterns
for each row execute function public.set_collector_updated_at();
