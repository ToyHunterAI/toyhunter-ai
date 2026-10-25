create table if not exists public.collector_approval_events (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references public.collector_ai_suggestions(id) on delete set null,
  action text not null
    check (action in (
      'APPROVE_NEW_ITEM',
      'APPROVE_MATCH_UPDATE',
      'EDIT_AND_APPROVE',
      'REJECT',
      'LINK_TO_EXISTING_ITEM',
      'CREATE_NEW_RELATED_ENTITY',
      'APPROVE_RELATIONSHIP',
      'REJECT_RELATIONSHIP'
    )),
  reviewer_id text,
  target_collector_item_id uuid references public.collector_items(id) on delete set null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  edits jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.collector_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references public.collector_ai_suggestions(id) on delete set null,
  decision text not null
    check (decision in (
      'APPROVE_NEW_ITEM',
      'APPROVE_MATCH_UPDATE',
      'EDIT_AND_APPROVE',
      'REJECT',
      'LINK_TO_EXISTING_ITEM',
      'CREATE_NEW_RELATED_ENTITY',
      'APPROVE_RELATIONSHIP',
      'REJECT_RELATIONSHIP'
    )),
  proposal_type text,
  confidence_before numeric,
  reviewer_changes jsonb not null default '{}'::jsonb,
  rejection_reason text,
  approved_item_id uuid references public.collector_items(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    confidence_before is null
    or (confidence_before >= 0 and confidence_before <= 1)
  )
);

create index if not exists collector_approval_events_suggestion_idx
  on public.collector_approval_events (suggestion_id);

create index if not exists collector_approval_events_action_idx
  on public.collector_approval_events (action);

create index if not exists collector_approval_events_target_item_idx
  on public.collector_approval_events (target_collector_item_id);

create index if not exists collector_approval_events_created_at_idx
  on public.collector_approval_events (created_at);

create index if not exists collector_ai_feedback_suggestion_idx
  on public.collector_ai_feedback (suggestion_id);

create index if not exists collector_ai_feedback_decision_idx
  on public.collector_ai_feedback (decision);

create index if not exists collector_ai_feedback_approved_item_idx
  on public.collector_ai_feedback (approved_item_id);

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.collector_ai_suggestions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%'
    and pg_get_constraintdef(oid) like '%approved%'
    and pg_get_constraintdef(oid) like '%rejected%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.collector_ai_suggestions drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.collector_ai_suggestions
  add constraint collector_ai_suggestions_status_check
  check (
    status in (
      'suggested',
      'under_review',
      'approved',
      'rejected',
      'linked',
      'superseded',
      'merged'
    )
  );
