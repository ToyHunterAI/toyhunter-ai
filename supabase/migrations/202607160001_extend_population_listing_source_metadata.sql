alter table public.collector_population_listings
  add column if not exists listing_title text,
  add column if not exists listing_description text,
  add column if not exists ebay_item_id text,
  add column if not exists platform text,
  add column if not exists search_query text,
  add column if not exists found_at timestamptz,
  add column if not exists price numeric,
  add column if not exists shipping_price numeric,
  add column if not exists currency text,
  add column if not exists seller_location text,
  add column if not exists condition text,
  add column if not exists category text,
  add column if not exists image_count integer,
  add column if not exists image_urls text[] not null default array[]::text[];

create index if not exists collector_population_listings_ebay_item_id_idx
  on public.collector_population_listings (ebay_item_id)
  where ebay_item_id is not null;

create index if not exists collector_population_listings_found_at_idx
  on public.collector_population_listings (found_at);

create index if not exists collector_population_listings_search_query_idx
  on public.collector_population_listings (search_query);

update public.collector_population_listings
set
  listing_title = coalesce(
    nullif(listing_title, ''),
    nullif(title, ''),
    nullif(input_payload->>'title', ''),
    nullif((builder_result->'input')->>'title', '')
  ),
  listing_description = coalesce(
    nullif(listing_description, ''),
    nullif(input_payload->>'description', ''),
    nullif((builder_result->'input')->>'description', '')
  ),
  ebay_item_id = coalesce(
    nullif(ebay_item_id, ''),
    substring(coalesce(listing_url, input_payload->>'listingUrl', '') from '/itm/([0-9]+)'),
    substring(coalesce(external_listing_id, '') from '([0-9]{8,})')
  ),
  platform = coalesce(
    nullif(platform, ''),
    nullif(source_platform, ''),
    nullif(input_payload->>'source', '')
  ),
  found_at = coalesce(found_at, processed_at, created_at),
  image_urls = case
    when coalesce(cardinality(image_urls), 0) > 0 then image_urls
    when jsonb_typeof(input_payload->'imageUrls') = 'array' then (
      select coalesce(array_agg(value), array[]::text[])
      from jsonb_array_elements_text(input_payload->'imageUrls') as images(value)
    )
    when jsonb_typeof((builder_result->'input')->'imageUrls') = 'array' then (
      select coalesce(array_agg(value), array[]::text[])
      from jsonb_array_elements_text((builder_result->'input')->'imageUrls') as images(value)
    )
    else image_urls
  end;

update public.collector_population_listings
set image_count = coalesce(
  image_count,
  nullif(cardinality(image_urls), 0),
  case
    when jsonb_typeof(input_payload->'imageUrls') = 'array'
      then jsonb_array_length(input_payload->'imageUrls')
    when jsonb_typeof((builder_result->'input')->'imageUrls') = 'array'
      then jsonb_array_length((builder_result->'input')->'imageUrls')
    else null
  end
);
