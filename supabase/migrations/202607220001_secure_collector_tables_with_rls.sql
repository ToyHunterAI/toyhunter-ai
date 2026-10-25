-- Collector Knowledge is private application data. All access goes through
-- authenticated ToyHunter server routes using the service role.

alter table public.collector_toylines enable row level security;
alter table public.collector_items enable row level security;
alter table public.collector_aliases enable row level security;
alter table public.collector_item_parts enable row level security;
alter table public.collector_item_traits enable row level security;
alter table public.collector_market_traits enable row level security;
alter table public.collector_ai_suggestions enable row level security;
alter table public.collector_media enable row level security;
alter table public.collector_item_relationships enable row level security;
alter table public.collector_approval_events enable row level security;
alter table public.collector_ai_feedback enable row level security;
alter table public.collector_ai_learning_events enable row level security;
alter table public.collector_population_jobs enable row level security;
alter table public.collector_population_listings enable row level security;
alter table public.collector_ai_learning_patterns enable row level security;
alter table public.toyhunter_market_values enable row level security;

revoke all on table public.collector_toylines from anon, authenticated;
revoke all on table public.collector_items from anon, authenticated;
revoke all on table public.collector_aliases from anon, authenticated;
revoke all on table public.collector_item_parts from anon, authenticated;
revoke all on table public.collector_item_traits from anon, authenticated;
revoke all on table public.collector_market_traits from anon, authenticated;
revoke all on table public.collector_ai_suggestions from anon, authenticated;
revoke all on table public.collector_media from anon, authenticated;
revoke all on table public.collector_item_relationships from anon, authenticated;
revoke all on table public.collector_approval_events from anon, authenticated;
revoke all on table public.collector_ai_feedback from anon, authenticated;
revoke all on table public.collector_ai_learning_events from anon, authenticated;
revoke all on table public.collector_population_jobs from anon, authenticated;
revoke all on table public.collector_population_listings from anon, authenticated;
revoke all on table public.collector_ai_learning_patterns from anon, authenticated;
revoke all on table public.toyhunter_market_values from anon, authenticated;

