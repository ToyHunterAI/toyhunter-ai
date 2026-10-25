do $$
declare
  selected_suggestion_id uuid := '61b0adc3-a549-48fa-899c-db17a7885278';
  toyline_id_value uuid;
  main_item_id_value uuid;
  creature_item_id_value uuid;
  rider_item_id_value uuid;
begin
  insert into public.collector_toylines (
    name,
    manufacturer,
    active_year_start,
    primary_region,
    obscurity_level,
    notes
  )
  values (
    'Dino Riders',
    'Tyco',
    1988,
    null,
    'unknown',
    'Human-approved Collector Knowledge Graph seed from AI suggestion 61b0adc3-a549-48fa-899c-db17a7885278. Evidence supports Tyco and 1988 listing context; broader active years/region are intentionally left uncertain.'
  )
  on conflict (name) do update
    set manufacturer = coalesce(public.collector_toylines.manufacturer, excluded.manufacturer),
        active_year_start = coalesce(public.collector_toylines.active_year_start, excluded.active_year_start),
        notes = case
          when public.collector_toylines.notes ilike '%61b0adc3-a549-48fa-899c-db17a7885278%' then public.collector_toylines.notes
          else concat_ws(E'\n', public.collector_toylines.notes, excluded.notes)
        end
  returning id into toyline_id_value;

  select id into main_item_id_value
  from public.collector_items
  where toyline_id = toyline_id_value
    and lower(name) = lower('Monoclonius with Mako')
    and item_type = 'creature_set'
    and coalesce(release_year, 0) = 1988
    and coalesce(series_or_wave, '') = ''
  limit 1;

  if main_item_id_value is null then
    insert into public.collector_items (
      toyline_id,
      name,
      item_type,
      manufacturer,
      release_year,
      popularity_level,
      rarity_level,
      collector_importance,
      collector_hidden_gem_level,
      completion_importance,
      typical_condition_classes,
      notes,
      confidence_level
    )
    values (
      toyline_id_value,
      'Monoclonius with Mako',
      'creature_set',
      'Tyco',
      1988,
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      array['LOOSE', 'COMPLETE', 'INCOMPLETE', 'PARTS']::text[],
      'Human-approved from AI suggestion 61b0adc3-a549-48fa-899c-db17a7885278. Unknown brown/red accessories were deliberately not promoted to approved collector facts.',
      'curated'
    )
    returning id into main_item_id_value;
  else
    update public.collector_items
    set manufacturer = coalesce(manufacturer, 'Tyco'),
        release_year = coalesce(release_year, 1988),
        typical_condition_classes = array['LOOSE', 'COMPLETE', 'INCOMPLETE', 'PARTS']::text[],
        confidence_level = 'curated',
        notes = case
          when notes ilike '%61b0adc3-a549-48fa-899c-db17a7885278%' then notes
          else concat_ws(E'\n', notes, 'Human-approved from AI suggestion 61b0adc3-a549-48fa-899c-db17a7885278. Unknown brown/red accessories were deliberately not promoted to approved collector facts.')
        end
    where id = main_item_id_value;
  end if;

  select id into creature_item_id_value
  from public.collector_items
  where toyline_id = toyline_id_value
    and lower(name) = lower('Monoclonius creature')
    and item_type = 'creature'
    and coalesce(release_year, 0) = 1988
    and coalesce(series_or_wave, '') = ''
  limit 1;

  if creature_item_id_value is null then
    insert into public.collector_items (
      toyline_id,
      name,
      item_type,
      manufacturer,
      release_year,
      popularity_level,
      rarity_level,
      collector_importance,
      collector_hidden_gem_level,
      completion_importance,
      typical_condition_classes,
      notes,
      confidence_level
    )
    values (
      toyline_id_value,
      'Monoclonius creature',
      'creature',
      'Tyco',
      1988,
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      array['LOOSE', 'PARTS']::text[],
      'Human-approved child entity from Monoclonius with Mako AI proposal. Accessory completeness remains unverified.',
      'curated'
    )
    returning id into creature_item_id_value;
  end if;

  select id into rider_item_id_value
  from public.collector_items
  where toyline_id = toyline_id_value
    and lower(name) = lower('Mako rider')
    and item_type = 'figure'
    and coalesce(release_year, 0) = 1988
    and coalesce(series_or_wave, '') = ''
  limit 1;

  if rider_item_id_value is null then
    insert into public.collector_items (
      toyline_id,
      name,
      item_type,
      manufacturer,
      release_year,
      popularity_level,
      rarity_level,
      collector_importance,
      collector_hidden_gem_level,
      completion_importance,
      typical_condition_classes,
      notes,
      confidence_level
    )
    values (
      toyline_id_value,
      'Mako rider',
      'figure',
      'Tyco',
      1988,
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      array['LOOSE', 'PARTS']::text[],
      'Human-approved child entity from Monoclonius with Mako AI proposal.',
      'curated'
    )
    returning id into rider_item_id_value;
  end if;

  insert into public.collector_aliases (
    collector_item_id,
    alias,
    alias_type,
    weight,
    confidence,
    source,
    notes
  )
  values
    (main_item_id_value, 'Monoclonius with Mako', 'search', 100, 1, 'human_review', 'Approved from reviewed AI proposal/listing title.'),
    (main_item_id_value, 'Monoclonius & Mako', 'seller_slang', 90, 0.95, 'human_review', 'Approved shorthand from reviewed AI proposal.'),
    (main_item_id_value, 'Monoclonius w/ Mako', 'seller_slang', 90, 0.95, 'human_review', 'Approved shorthand from reviewed AI proposal/listing title.')
  on conflict (collector_item_id, alias, alias_type) do update
    set weight = greatest(public.collector_aliases.weight, excluded.weight),
        confidence = greatest(public.collector_aliases.confidence, excluded.confidence),
        source = excluded.source,
        notes = coalesce(public.collector_aliases.notes, excluded.notes);

  insert into public.collector_item_traits (
    collector_item_id,
    trait_name,
    trait_value,
    confidence,
    source,
    notes
  )
  values
    (main_item_id_value, 'dinosaur species', 'Monoclonius', 1, 'human_review', 'Approved from reviewed AI proposal/listing context.'),
    (main_item_id_value, 'rider name', 'Mako', 1, 'human_review', 'Approved from reviewed AI proposal/listing context.'),
    (main_item_id_value, 'manufacturer', 'Tyco', 1, 'human_review', 'Also stored in collector_items.manufacturer.'),
    (main_item_id_value, 'release year', '1988', 0.9, 'human_review', 'Also stored in collector_items.release_year; based on reviewed proposal/listing context.')
  on conflict (collector_item_id, trait_name, trait_value) do update
    set confidence = greatest(public.collector_item_traits.confidence, excluded.confidence),
        source = excluded.source,
        notes = coalesce(public.collector_item_traits.notes, excluded.notes);

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
    evidence
  )
  values
    (
      main_item_id_value,
      creature_item_id_value,
      'includes',
      1,
      'human_review',
      'approved',
      true,
      'critical',
      1,
      'Human-approved: Monoclonius with Mako includes the Monoclonius creature entity.',
      jsonb_build_object('approved_from_suggestion_id', selected_suggestion_id, 'approval_source', 'human_review')
    ),
    (
      main_item_id_value,
      rider_item_id_value,
      'includes',
      1,
      'human_review',
      'approved',
      true,
      'high',
      1,
      'Human-approved: Monoclonius with Mako includes the Mako rider entity.',
      jsonb_build_object('approved_from_suggestion_id', selected_suggestion_id, 'approval_source', 'human_review')
    ),
    (
      rider_item_id_value,
      creature_item_id_value,
      'rider_for',
      1,
      'human_review',
      'approved',
      null,
      null,
      1,
      'Human-approved: Mako rider is rider_for the Monoclonius creature entity.',
      jsonb_build_object('approved_from_suggestion_id', selected_suggestion_id, 'approval_source', 'human_review')
    )
  on conflict do nothing;

  update public.collector_ai_suggestions
  set collector_item_id = main_item_id_value,
      suggested_collector_item_id = main_item_id_value,
      status = 'approved',
      reviewed_at = coalesce(reviewed_at, now()),
      evidence = coalesce(evidence, '{}'::jsonb) || jsonb_build_object(
        'approved_to_collector_item_id', main_item_id_value,
        'approved_child_entity_ids', jsonb_build_object(
          'monoclonius_creature', creature_item_id_value,
          'mako_rider', rider_item_id_value
        ),
        'approval_source', 'human_review',
        'approved_relationships', jsonb_build_array(
          jsonb_build_object('source_item_id', main_item_id_value, 'target_item_id', creature_item_id_value, 'relationship_type', 'includes'),
          jsonb_build_object('source_item_id', main_item_id_value, 'target_item_id', rider_item_id_value, 'relationship_type', 'includes'),
          jsonb_build_object('source_item_id', rider_item_id_value, 'target_item_id', creature_item_id_value, 'relationship_type', 'rider_for')
        ),
        'unknown_accessories_not_promoted', jsonb_build_array(
          'brown plastic accessory',
          'red plastic accessory sprue with multiple small parts'
        )
      )
  where id = selected_suggestion_id;
end $$;
