create table if not exists public.collector_ai_learning_events (
  id uuid primary key default gen_random_uuid(),
  approval_event_id uuid references public.collector_approval_events(id) on delete set null,
  suggestion_id uuid references public.collector_ai_suggestions(id) on delete set null,
  collector_item_id uuid references public.collector_items(id) on delete set null,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  change_type text not null
    check (change_type in (
      'identity',
      'alias',
      'trait',
      'relationship',
      'condition',
      'manufacturer',
      'release_year',
      'item_type',
      'toyline',
      'entity',
      'part',
      'media',
      'notes',
      'seller_claim',
      'review_outcome'
    )),
  severity text not null
    check (severity in ('none', 'minor', 'major', 'critical')),
  confidence_before numeric,
  confidence_after numeric,
  review_outcome text not null
    check (review_outcome in (
      'PERFECT',
      'MINOR_EDIT',
      'MAJOR_EDIT',
      'NEW_ENTITY',
      'LINK_EXISTING',
      'ADD_RELATIONSHIP',
      'REMOVE_RELATIONSHIP',
      'REJECT'
    )),
  human_comment text,
  created_at timestamptz not null default now(),
  check (
    confidence_before is null
    or (confidence_before >= 0 and confidence_before <= 1)
  ),
  check (
    confidence_after is null
    or (confidence_after >= 0 and confidence_after <= 1)
  )
);

create index if not exists collector_ai_learning_events_approval_event_idx
  on public.collector_ai_learning_events (approval_event_id);

create index if not exists collector_ai_learning_events_suggestion_idx
  on public.collector_ai_learning_events (suggestion_id);

create index if not exists collector_ai_learning_events_collector_item_idx
  on public.collector_ai_learning_events (collector_item_id);

create index if not exists collector_ai_learning_events_field_name_idx
  on public.collector_ai_learning_events (field_name);

create index if not exists collector_ai_learning_events_change_type_idx
  on public.collector_ai_learning_events (change_type);

create index if not exists collector_ai_learning_events_review_outcome_idx
  on public.collector_ai_learning_events (review_outcome);

create index if not exists collector_ai_learning_events_created_at_idx
  on public.collector_ai_learning_events (created_at);
